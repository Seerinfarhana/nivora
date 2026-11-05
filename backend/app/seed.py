import random
from datetime import datetime, timedelta

from sqlmodel import Session, select

from .db import engine
from .models import Account, AuditLog, Beneficiary, Goal, Transaction, User
from .security import hash_pw

SPEND = {
    "Food": ["Swiggy", "Zomato", "Local restaurant", "Cafe Coffee Day"],
    "Shopping": ["Amazon", "Flipkart", "Myntra"],
    "Bills": ["TNEB electricity", "Airtel recharge", "Broadband"],
    "Transport": ["Metro recharge", "Uber", "Ola"],
    "Health": ["Apollo Pharmacy", "Clinic"],
    "Leisure": ["BookMyShow", "Netflix"],
}


def seed_if_empty():
    with Session(engine) as s:
        if s.exec(select(User)).first():
            return
        rnd = random.Random(7)
        demo = User(name="Seerin", email="demo@nivora.in", phone="+91 98765 43210",
                    password_hash=hash_pw("demo1234"), pin_hash=hash_pw("1234"), language="en")
        admin = User(name="Compliance Admin", email="admin@nivora.in", password_hash=hash_pw("admin1234"),
                     pin_hash=hash_pw("1234"), role="admin")
        s.add(demo)
        s.add(admin)
        s.commit()
        s.refresh(demo)

        savings = Account(user_id=demo.id, type="Savings", number="•••• 4821", balance=184250.5)
        s.add(savings)
        s.commit()
        s.refresh(savings)
        s.add(Account(user_id=demo.id, type="Current", number="•••• 9034", balance=62300))
        s.add(Account(user_id=demo.id, type="Fixed deposit", number="•••• 1177", balance=150000))

        now = datetime.now()
        for d in range(180):
            day = now - timedelta(days=d)
            if day.day == 1:
                s.add(Transaction(user_id=demo.id, account_id=savings.id, name="Salary · Acme Pvt Ltd",
                                  category="Income", amount=52000, created_at=day))
            if rnd.random() < 0.6:
                cat = rnd.choice(list(SPEND))
                s.add(Transaction(user_id=demo.id, account_id=savings.id, name=rnd.choice(SPEND[cat]), category=cat,
                                  amount=-float(rnd.randint(12, 240) * 10), created_at=day))

        for name, acc in [("Ravi Kumar", "XXXX 2210"), ("Priya Sharma", "XXXX 7781"), ("Mom", "XXXX 3345")]:
            s.add(Beneficiary(user_id=demo.id, name=name, account_no=acc))
        for name, target, saved, due in [("Emergency fund", 150000, 98000, "Mar 2027"),
                                         ("Laptop upgrade", 80000, 34000, "Jan 2027"),
                                         ("Family trip", 60000, 52500, "Dec 2026")]:
            s.add(Goal(user_id=demo.id, name=name, target=target, saved=saved, due=due))

        sample = [("Balance", "Read balances", "Approved"), ("Transfer ₹2,40,000", "Above daily limit", "Blocked"),
                  ("Block card", "Debit card frozen", "Approved"), ("Add beneficiary", "New payee, OTP sent", "Review"),
                  ("Sensitive data", "Refused sharing credentials", "Blocked"), ("Loan eligibility", "Answered from policy", "Approved"),
                  ("Balance", "Read balances", "Approved"), ("Spending", "Read spending summary", "Approved")]
        for i, (intent, action, status) in enumerate(sample):
            s.add(AuditLog(user_id=demo.id, intent=intent, action=action, status=status,
                           created_at=now - timedelta(minutes=7 * (i + 1))))
        s.commit()


STARTER_PAYEES = [("Ravi Kumar", "XXXX 2210"), ("Priya Sharma", "XXXX 7781"), ("Mom", "XXXX 3345")]


def starter_data(s: Session, u: User):
    """Gives a new customer a Savings balance, sample payees, 90 days of transactions and one goal,
    so every page and the assistant have something real to work with."""
    rnd = random.Random(u.id * 101)
    savings = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if not savings:
        savings = Account(user_id=u.id, type="Savings", number=f"•••• {1000 + u.id * 37}", balance=0)
        s.add(savings)
        s.commit()
        s.refresh(savings)
    if savings.balance == 0:
        savings.balance = 48500.0
        s.add(savings)
    now = datetime.now()
    for d in range(90):
        day = now - timedelta(days=d)
        if day.day == 1:
            s.add(Transaction(user_id=u.id, account_id=savings.id, name="Salary", category="Income", amount=42000, created_at=day))
        if rnd.random() < 0.5:
            cat = rnd.choice(list(SPEND))
            s.add(Transaction(user_id=u.id, account_id=savings.id, name=rnd.choice(SPEND[cat]), category=cat,
                              amount=-float(rnd.randint(12, 200) * 10), created_at=day))
    for name, acc in STARTER_PAYEES:
        s.add(Beneficiary(user_id=u.id, name=name, account_no=acc))
    s.add(Goal(user_id=u.id, name="Emergency fund", target=50000, saved=5000, due="Dec 2027"))
    s.commit()


def backfill_starter_data():
    """Customers created before starter data existed (no transactions and no payees) get it once."""
    with Session(engine) as s:
        for u in s.exec(select(User).where(User.role == "customer")).all():
            has_tx = s.exec(select(Transaction).where(Transaction.user_id == u.id)).first()
            has_ben = s.exec(select(Beneficiary).where(Beneficiary.user_id == u.id)).first()
            if not has_tx and not has_ben:
                starter_data(s, u)

