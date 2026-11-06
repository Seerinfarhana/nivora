"""Secure banking tools. The assistant (rule-based now, an LLM later) can ONLY act through these.
Every function is scoped to the logged-in user and writes to the audit log where it matters."""
import math
import random
import re
from types import SimpleNamespace
from datetime import datetime, timedelta

from sqlmodel import Session, select

from .config import NEW_PAYEE_LIMIT
from .models import Account, AuditLog, Beneficiary, PinGuard, Transaction, User
from .security import check_pw

PENDING: dict[int, dict] = {}  # user_id -> transfer waiting for PIN confirmation
MAX_PIN_TRIES = 3
LOCK_MINUTES = 15


def inr(n: float) -> str:
    n = round(n, 2)
    whole, dec = f"{abs(n):.2f}".split(".")
    if len(whole) > 3:
        head, tail, groups = whole[:-3], whole[-3:], []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        whole = ",".join(groups + [tail])
    return ("-" if n < 0 else "") + "₹" + whole + ("" if dec == "00" else "." + dec)


def log(s: Session, u: User | None, intent: str, action: str, status: str):
    s.add(AuditLog(user_id=u.id if u else None, intent=intent, action=action, status=status))
    s.commit()


def _accounts(s: Session, u: User):
    return s.exec(select(Account).where(Account.user_id == u.id)).all()


def get_balance(s: Session, u: User):
    accs = _accounts(s, u)
    return {
        "accounts": [{"type": a.type, "number": a.number, "balance": a.balance} for a in accs],
        "total": round(sum(a.balance for a in accs), 2),
    }


def get_transactions(s: Session, u: User, limit: int = 10):
    rows = s.exec(
        select(Transaction).where(Transaction.user_id == u.id).order_by(Transaction.created_at.desc()).limit(limit)
    ).all()
    return [
        {"id": t.id, "name": t.name, "category": t.category, "amount": t.amount, "date": t.created_at.strftime("%d %b")}
        for t in rows
    ]


def spending_summary(s: Session, u: User, days: int = 30):
    since = datetime.now() - timedelta(days=days)
    rows = s.exec(
        select(Transaction).where(Transaction.user_id == u.id, Transaction.amount < 0, Transaction.created_at >= since)
    ).all()
    by: dict[str, float] = {}
    for t in rows:
        by[t.category] = by.get(t.category, 0) + abs(t.amount)
    cats = [{"name": k, "value": round(v, 2)} for k, v in sorted(by.items(), key=lambda x: -x[1])]
    return {"days": days, "total": round(sum(by.values()), 2), "categories": cats}


def monthly_summary(s: Session, u: User, months: int = 6):
    rows = s.exec(select(Transaction).where(Transaction.user_id == u.id)).all()
    agg: dict[str, dict] = {}
    for t in rows:
        d = agg.setdefault(t.created_at.strftime("%Y-%m"), {"m": t.created_at.strftime("%b"), "income": 0.0, "spend": 0.0})
        if t.amount > 0:
            d["income"] += t.amount
        else:
            d["spend"] += -t.amount
    return [agg[k] for k in sorted(agg)][-months:]


def find_beneficiary(s: Session, u: User, text: str):
    text = text.lower()
    for b in s.exec(select(Beneficiary).where(Beneficiary.user_id == u.id)).all():
        if b.name.lower().split()[0] in text:
            return b
    return None


def _lock_minutes_left(s: Session, u: User) -> int:
    g = s.get(PinGuard, u.id)
    if g and g.locked_until and g.locked_until > datetime.now():
        return max(1, math.ceil((g.locked_until - datetime.now()).total_seconds() / 60))
    return 0


def _mins(n: int) -> str:
    return f"{n} minute{'s' if n != 1 else ''}"


def verify_pin(s: Session, u: User, pin: str):
    """Checks a PIN and enforces the lockout: 3 wrong tries pause PIN actions for 15 minutes."""
    left = _lock_minutes_left(s, u)
    if left:
        return {"ok": False, "locked": True, "reason": f"Too many wrong PIN attempts. Try again in {_mins(left)}."}
    g = s.get(PinGuard, u.id) or PinGuard(user_id=u.id)
    if check_pw(pin, u.pin_hash):
        g.failures, g.locked_until = 0, None
        s.add(g)
        s.commit()
        return {"ok": True, "locked": False}
    g.failures += 1
    if g.failures >= MAX_PIN_TRIES:
        g.failures, g.locked_until = 0, datetime.now() + timedelta(minutes=LOCK_MINUTES)
        s.add(g)
        s.commit()
        return {"ok": False, "locked": True,
                "reason": f"Wrong PIN {MAX_PIN_TRIES} times. For your safety, PIN actions are paused for {_mins(LOCK_MINUTES)}."}
    s.add(g)
    s.commit()
    n = MAX_PIN_TRIES - g.failures
    return {"ok": False, "locked": False, "reason": f"That PIN is incorrect. {n} {'try' if n == 1 else 'tries'} left."}


def prepare_transfer(s: Session, u: User, ben, amount: float, extra: dict | None = None):
    left = _lock_minutes_left(s, u)
    if left:
        return {"status": "rejected", "reason": f"Transfers are paused after too many wrong PINs. Try again in {_mins(left)}."}
    if amount <= 0:
        return {"status": "rejected", "reason": "The amount must be more than zero."}
    acc = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if not acc or amount > acc.balance:
        return {"status": "rejected", "reason": "Your savings balance is too low for this transfer."}
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today = s.exec(
        select(Transaction).where(Transaction.user_id == u.id, Transaction.category == "Transfer", Transaction.created_at >= start)
    ).all()
    if sum(abs(t.amount) for t in today) + amount > u.txn_limit:
        log(s, u, "Transfer " + inr(amount), "Above daily limit", "Blocked")
        return {"status": "rejected", "reason": f"This would pass your daily transfer limit of {inr(u.txn_limit)}."}
    PENDING[u.id] = {"to": ben.name, "amount": amount, **(extra or {})}
    log(s, u, "Transfer " + inr(amount), "Waiting for PIN confirmation", "Review")
    return {"status": "needs_confirmation", "to": ben.name, "amount": amount}


def confirm_transfer(s: Session, u: User, pin: str):
    p = PENDING.get(u.id)
    if not p:
        return {"status": "rejected", "reason": "There is no transfer waiting for confirmation."}
    v = verify_pin(s, u, pin)
    if not v["ok"]:
        if v["locked"]:
            PENDING.pop(u.id, None)
            log(s, u, "Transfer " + inr(p["amount"]), "PIN locked after wrong attempts", "Blocked")
            return {"status": "locked", "reason": v["reason"]}
        log(s, u, "Transfer " + inr(p["amount"]), "Wrong PIN", "Blocked")
        return {"status": "rejected", "reason": v["reason"]}
    acc = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if not acc or p["amount"] > acc.balance:
        PENDING.pop(u.id, None)
        return {"status": "rejected", "reason": "Your savings balance is too low for this transfer."}
    acc.balance -= p["amount"]
    s.add(Transaction(user_id=u.id, account_id=acc.id, name=p["to"], category="Transfer", amount=-p["amount"]))
    s.add(acc)
    rec = p.get("recipient") or {}
    if rec.get("kind") == "internal":  # the other person also banks with NIVORA, so their account is credited for real
        dest = s.exec(select(Account).where(Account.user_id == rec["user_id"], Account.type == "Savings")).first()
        if dest:
            dest.balance += p["amount"]
            s.add(dest)
            s.add(Transaction(user_id=rec["user_id"], account_id=dest.id, name=f"From {u.name}", category="Income", amount=p["amount"]))
    if rec.get("new"):  # remember the payee after the first confirmed payment
        s.add(Beneficiary(user_id=u.id, name=rec["display"], account_no="UPI", upi_id=rec.get("upi_id", ""), phone=rec.get("phone", "")))
    s.commit()
    PENDING.pop(u.id, None)
    log(s, u, "Transfer " + inr(p["amount"]), "Confirmed with PIN", "Approved")
    return {"status": "done", "to": p["to"], "amount": p["amount"], "ref": f"NV{random.randint(10000, 99999)}", "balance": acc.balance,
            "simulated": rec.get("kind") == "external"}


UPI_RE = re.compile(r"(?<![\w.])([A-Za-z0-9][\w.\-]*@[A-Za-z][A-Za-z0-9.\-]+)")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?([6-9]\d{9})(?!\d)")
AMOUNT_RE = re.compile(r"(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)", re.I)


def parse_payment(text: str):
    """Pulls a UPI ID or mobile number, and the amount, out of a sentence like 'send 500 to ravi@oksbi'."""
    token, rest = None, text
    m = UPI_RE.search(text)
    if m:
        token, rest = m.group(1), text.replace(m.group(0), " ")
    else:
        m = PHONE_RE.search(text)
        if m:
            token, rest = m.group(1), text.replace(m.group(0), " ")
    a = AMOUNT_RE.search(rest)
    return token, (float(a.group(1).replace(",", "")) if a else None)


def resolve_recipient(s: Session, u: User, ref: str):
    """Works out who a payment goes to. Returns a dict, or None when the name is not a saved payee."""
    ref = ref.strip()
    low = ref.lower()
    digits = re.sub(r"\D", "", ref)
    upi = low if "@" in low else ""
    phone = digits[-10:] if not upi and len(digits) >= 10 and digits[-10] in "6789" else ""
    if upi.endswith("@nivora") and upi.split("@")[0].isdigit():
        phone = upi.split("@")[0][-10:]  # every NIVORA customer's UPI ID is <mobile>@nivora

    if u.phone and (phone == u.phone or upi == f"{u.phone}@nivora"):
        return {"error": "You cannot send money to yourself."}
    payees = s.exec(select(Beneficiary).where(Beneficiary.user_id == u.id)).all()
    for b in payees:
        if (upi and b.upi_id.lower() == upi) or (phone and b.phone == phone) or (not upi and not phone and b.name.lower().split()[0] in low):
            return {"kind": "saved", "display": b.name, "upi_id": b.upi_id, "phone": b.phone, "new": False}
    if not upi and not phone:
        return None
    if phone:
        other = s.exec(select(User).where(User.phone == phone, User.id != u.id, User.role == "customer")).first()
        if other:
            return {"kind": "internal", "display": f"{other.name} (NIVORA)", "upi_id": f"{phone}@nivora", "phone": phone, "user_id": other.id, "new": True}
    return {"kind": "external", "display": upi or f"+91 {phone}", "upi_id": upi, "phone": phone, "new": True}


def prepare_payment(s: Session, u: User, recipient: str, amount: float | None):
    """Step 1 of an agent payment. Nothing moves until the customer enters their PIN on the confirmation card."""
    if not amount or amount <= 0:
        return {"status": "rejected", "reason": "Tell me how much to send."}
    r = resolve_recipient(s, u, recipient)
    if r is None:
        return {"status": "rejected", "reason": f"I could not find \"{recipient}\" in your payees. Give me their UPI ID or 10-digit mobile number."}
    if r.get("error"):
        return {"status": "rejected", "reason": r["error"]}
    if r["new"] and amount > NEW_PAYEE_LIMIT:
        log(s, u, "Transfer " + inr(amount), "Above new-payee limit", "Blocked")
        return {"status": "rejected", "reason": f"The first payment to someone new is limited to {inr(NEW_PAYEE_LIMIT)}. Send a smaller amount first; after that your normal daily limit applies."}
    res = prepare_transfer(s, u, SimpleNamespace(name=r["display"]), amount, extra={"recipient": r})
    if res["status"] == "needs_confirmation":
        res["new_payee"], res["simulated"] = r["new"], r["kind"] == "external"
    return res


def start_payment(s: Session, u: User, text: str):
    token, amount = parse_payment(text)
    who = token
    if not who:
        b = find_beneficiary(s, u, text)
        who = b.name if b else None
    if not who:
        return {"status": "rejected", "reason": "Who should I send it to? Give me a UPI ID, a 10-digit mobile number, or the name of a saved payee."}
    if amount is None:
        return {"status": "rejected", "reason": f"How much would you like to send to {who}?"}
    return prepare_payment(s, u, who, amount)


def cancel_transfer(s: Session, u: User):
    PENDING.pop(u.id, None)


def block_card(s: Session, u: User):
    u.card_blocked = True
    s.add(u)
    s.commit()
    log(s, u, "Block card", "Debit card frozen", "Approved")
    return {"status": "blocked"}


def loan_eligibility(s: Session, u: User):
    m = monthly_summary(s, u, 3)
    income = sum(x["income"] for x in m) / max(len(m), 1)
    ok = income >= 20000
    log(s, u, "Loan eligibility", "Answered from policy", "Approved")
    return {"eligible": ok, "avg_monthly_income": round(income), "max_amount": round(income * 8, -3) if ok else 0, "rate": "10.5% p.a. (indicative)"}


FAQ = [
    {"title": "Open an account", "keywords": ["open", "account", "register", "kyc"], "answer": "Register, verify your mobile with an OTP, then complete e-KYC with Aadhaar and PAN. Most accounts are active within 10 minutes."},
    {"title": "Transfer limits", "keywords": ["limit", "upi", "neft", "transfer limit"], "answer": "UPI allows up to ₹1,00,000 per day by default. NEFT runs 24x7. You can set a lower limit in Profile and security."},
    {"title": "Block a card", "keywords": ["block", "lost", "stolen", "card"], "answer": "Say 'block my card' to the assistant or use Profile and security. The card is frozen immediately and you can request a new one."},
    {"title": "Failed payment", "keywords": ["fail", "failed", "refund", "debited"], "answer": "Failed payments are usually caused by low balance, a daily limit or a server timeout. Money that was debited is refunded within 3 working days."},
    {"title": "Phishing", "keywords": ["phishing", "fraud", "scam", "suspicious"], "answer": "NIVORA never asks for your PIN, OTP or password. Don't click links in unexpected messages and report them from Profile and security."},
    {"title": "Update KYC", "keywords": ["update", "kyc", "address", "document"], "answer": "Open Profile, choose Update KYC and upload the new document. Verification usually completes within one working day."},
    {"title": "Forgot card PIN", "keywords": ["forgot", "pin", "reset", "generate", "change"], "answer": "You can usually set or reset a card PIN from your bank's mobile app, net banking, an ATM or the bank's IVR. The steps differ by bank and by card, so tell me your bank, whether it is a debit or credit card, and the network (RuPay, Visa or Mastercard). Never share your PIN or OTP with anyone."},
    {"title": "International transactions", "keywords": ["international", "abroad", "foreign", "overseas", "enable"], "answer": "Cards are often switched off for international use by default. Most banks let you turn it on from their app or net banking under card settings, usually with limits you can set. Tell me your bank and card type and I will explain the steps."}
]


def faq_search(query: str):
    q = query.lower()
    scored = sorted(((sum(k in q for k in f["keywords"]), f) for f in FAQ), key=lambda x: -x[0])
    return scored[0][1] if scored and scored[0][0] > 0 else None


def weekly_summary(s: Session, u: User, weeks: int = 4):
    now = datetime.now()
    rows = s.exec(select(Transaction).where(
        Transaction.user_id == u.id, Transaction.amount < 0,
        Transaction.created_at >= now - timedelta(days=7 * weeks))).all()
    out = []
    for i in range(weeks):
        end = now - timedelta(days=7 * i)
        start = end - timedelta(days=7)
        out.append({"w": f"Wk {weeks - i}",
                    "spend": round(sum(-t.amount for t in rows if start < t.created_at <= end), 2)})
    return list(reversed(out))


def insights(s: Session, u: User):
    """Plain-language observations computed from the user's own transactions."""
    now = datetime.now()
    out = []
    cur = spending_summary(s, u, 30)
    if cur["categories"]:
        top = cur["categories"][0]
        pct = round(top["value"] / cur["total"] * 100)
        out.append({"tone": "sand", "title": f"{top['name']} is your biggest expense",
                    "body": f"You spent {inr(top['value'])} on {top['name'].lower()} in the last 30 days, {pct}% of your spending."})
    prev_rows = s.exec(select(Transaction).where(
        Transaction.user_id == u.id, Transaction.amount < 0,
        Transaction.created_at >= now - timedelta(days=60), Transaction.created_at < now - timedelta(days=30))).all()
    prev_total = sum(-t.amount for t in prev_rows)
    if prev_total > 0 and cur["total"] > 0:
        chg = round((cur["total"] - prev_total) / prev_total * 100)
        out.append({"tone": "sky", "title": f"Spending is {'up' if chg >= 0 else 'down'} {abs(chg)}% on the previous 30 days",
                    "body": f"{inr(cur['total'])} in the last 30 days, against {inr(prev_total)} in the 30 days before."})
    for m in reversed(monthly_summary(s, u)):
        if m["income"] > 0:
            rate = round((m["income"] - m["spend"]) / m["income"] * 100)
            tip = "That is above the common 30% target." if rate >= 30 else "A common target is 30%. Moving a little into a goal would help."
            out.append({"tone": "mint", "title": f"You saved {rate}% of your income in {m['m']}", "body": tip})
            break
    big = s.exec(select(Transaction).where(
        Transaction.user_id == u.id, Transaction.amount < 0, Transaction.created_at >= now - timedelta(days=30)
    ).order_by(Transaction.amount)).first()
    if big:
        out.append({"tone": "lav", "title": f"Largest expense: {big.name}",
                    "body": f"{inr(abs(big.amount))} on {big.created_at.strftime('%d %b')} under {big.category.lower()}."})
    return out

