"""Secure banking tools. The assistant (rule-based now, an LLM later) can ONLY act through these.
Every function is scoped to the logged-in user and writes to the audit log where it matters."""
import random
from datetime import datetime, timedelta

from sqlmodel import Session, select

from .config import DAILY_TRANSFER_LIMIT
from .models import Account, AuditLog, Beneficiary, Transaction, User
from .security import check_pw

PENDING: dict[int, dict] = {}  # user_id -> transfer waiting for PIN confirmation


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


def prepare_transfer(s: Session, u: User, ben: Beneficiary, amount: float):
    if amount <= 0:
        return {"status": "rejected", "reason": "The amount must be more than zero."}
    acc = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if not acc or amount > acc.balance:
        return {"status": "rejected", "reason": "Your savings balance is too low for this transfer."}
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today = s.exec(
        select(Transaction).where(Transaction.user_id == u.id, Transaction.category == "Transfer", Transaction.created_at >= start)
    ).all()
    if sum(abs(t.amount) for t in today) + amount > DAILY_TRANSFER_LIMIT:
        log(s, u, "Transfer " + inr(amount), "Above daily limit", "Blocked")
        return {"status": "rejected", "reason": f"This would pass your daily transfer limit of {inr(DAILY_TRANSFER_LIMIT)}."}
    PENDING[u.id] = {"to": ben.name, "amount": amount}
    log(s, u, "Transfer " + inr(amount), "Waiting for PIN confirmation", "Review")
    return {"status": "needs_confirmation", "to": ben.name, "amount": amount}


def confirm_transfer(s: Session, u: User, pin: str):
    p = PENDING.get(u.id)
    if not p:
        return {"status": "rejected", "reason": "There is no transfer waiting for confirmation."}
    if not check_pw(pin, u.pin_hash):
        log(s, u, "Transfer " + inr(p["amount"]), "Wrong PIN", "Blocked")
        return {"status": "rejected", "reason": "That PIN is incorrect."}
    acc = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if not acc or p["amount"] > acc.balance:
        PENDING.pop(u.id, None)
        return {"status": "rejected", "reason": "Your savings balance is too low for this transfer."}
    acc.balance -= p["amount"]
    s.add(Transaction(user_id=u.id, account_id=acc.id, name=p["to"], category="Transfer", amount=-p["amount"]))
    s.add(acc)
    s.commit()
    PENDING.pop(u.id, None)
    log(s, u, "Transfer " + inr(p["amount"]), "Confirmed with PIN", "Approved")
    return {"status": "done", "to": p["to"], "amount": p["amount"], "ref": f"NV{random.randint(10000, 99999)}", "balance": acc.balance}


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
]


def faq_search(query: str):
    q = query.lower()
    scored = sorted(((sum(k in q for k in f["keywords"]), f) for f in FAQ), key=lambda x: -x[0])
    return scored[0][1] if scored and scored[0][0] > 0 else None
