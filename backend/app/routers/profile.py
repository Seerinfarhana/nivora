import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from .. import tools
from ..db import get_session
from ..models import Account, Goal, Transaction, User
from ..security import current_user

router = APIRouter()
MAX = 1_000_000_000


class GoalIn(BaseModel):
    name: str
    target: float = Field(gt=0, le=MAX)
    saved: float = Field(default=0, ge=0, le=MAX)
    due: str = ""


class OnboardingIn(BaseModel):
    user_type: str = "individual"  # individual | business
    monthly_income: float = Field(default=0, ge=0, le=MAX)
    monthly_revenue: float = Field(default=0, ge=0, le=MAX)  # businesses
    monthly_spend: float = Field(default=0, ge=0, le=MAX)
    spend_split: dict[str, float] = {}  # optional: Food, Bills, ...
    opening_balance: float | None = Field(default=None, ge=0, le=MAX)  # only used the first time
    goals: list[GoalIn] = []
    investments: list[str] = []


@router.get("")
def my_profile(u: User = Depends(current_user), s: Session = Depends(get_session)):
    declared = s.exec(select(Transaction).where(Transaction.user_id == u.id, Transaction.source == "declared")).all()
    split = {t.category: abs(t.amount) for t in declared if t.amount < 0 and t.category != "Other"}
    return {"onboarded": u.onboarded, "user_type": u.user_type, "monthly_income": u.monthly_income,
            "monthly_revenue": u.monthly_revenue, "monthly_spend": u.monthly_spend, "spend_split": split,
            "investments": [i for i in (u.investments or "").split(",") if i]}


@router.post("/onboarding")
def onboarding(body: OnboardingIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    """Saves what the customer tells us. Their income and spending become real entries
    (marked 'declared') so the dashboard, insights and assistant all read the same numbers."""
    first_time = not u.onboarded
    split = {k.strip()[:30]: v for k, v in body.spend_split.items() if k.strip() and 0 < v <= MAX}
    spend = body.monthly_spend or sum(split.values())
    if body.monthly_income <= 0 and body.monthly_revenue <= 0:
        raise HTTPException(400, "Tell us your monthly income or revenue so we can build your dashboard")
    u.user_type = "business" if body.user_type == "business" else "individual"
    u.monthly_income, u.monthly_revenue, u.monthly_spend = body.monthly_income, body.monthly_revenue, spend
    u.investments = ",".join(i.strip()[:40] for i in body.investments if i.strip())
    u.onboarded = True

    acc = s.exec(select(Account).where(Account.user_id == u.id, Account.type == "Savings")).first()
    if acc and first_time and body.opening_balance is not None:
        acc.balance = body.opening_balance
        s.add(acc)

    for t in s.exec(select(Transaction).where(Transaction.user_id == u.id, Transaction.source == "declared")).all():
        s.delete(t)  # re-running onboarding replaces the earlier answers instead of doubling them
    aid = acc.id if acc else None

    def add(name: str, cat: str, amount: float):
        s.add(Transaction(user_id=u.id, account_id=aid, name=name, category=cat, amount=amount, source="declared"))

    if body.monthly_income > 0:
        add("Monthly income (from your details)", "Income", body.monthly_income)
    if u.user_type == "business" and body.monthly_revenue > 0:
        add("Monthly business revenue (from your details)", "Income", body.monthly_revenue)
    for cat, v in split.items():
        add(f"{cat} (from your details)", cat, -v)
    rest = spend - sum(split.values())
    if rest > 0:
        add("Other spending (from your details)", "Other", -rest)

    if first_time:
        for g in body.goals:
            if g.name.strip():
                s.add(Goal(user_id=u.id, name=g.name.strip()[:60], target=g.target, saved=g.saved, due=g.due))
    s.add(u)
    s.commit()
    tools.log(s, u, "Onboarding", "Customer shared income, spending and goals", "Approved")
    return {"ok": True}
