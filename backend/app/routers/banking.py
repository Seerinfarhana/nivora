from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import tools
from ..db import get_session
from ..models import Beneficiary, Goal, User
from ..security import current_user

router = APIRouter()


class GoalIn(BaseModel):
    name: str
    target: float
    saved: float = 0
    due: str = ""


class BenIn(BaseModel):
    name: str
    account_no: str


@router.get("/accounts")
def accounts(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.get_balance(s, u)


@router.get("/transactions")
def transactions(limit: int = 20, s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.get_transactions(s, u, min(limit, 100))


@router.get("/spending")
def spending(days: int = 30, s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.spending_summary(s, u, days)


@router.get("/monthly")
def monthly(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.monthly_summary(s, u)


@router.get("/goals")
def goals(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return s.exec(select(Goal).where(Goal.user_id == u.id)).all()


@router.post("/goals")
def add_goal(body: GoalIn, s: Session = Depends(get_session), u: User = Depends(current_user)):
    g = Goal(user_id=u.id, **body.model_dump())
    s.add(g)
    s.commit()
    s.refresh(g)
    return g


@router.get("/beneficiaries")
def beneficiaries(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return s.exec(select(Beneficiary).where(Beneficiary.user_id == u.id)).all()


@router.post("/beneficiaries")
def add_beneficiary(body: BenIn, s: Session = Depends(get_session), u: User = Depends(current_user)):
    b = Beneficiary(user_id=u.id, **body.model_dump())
    s.add(b)
    s.commit()
    s.refresh(b)
    tools.log(s, u, "Add beneficiary", "New payee added", "Review")
    return b
