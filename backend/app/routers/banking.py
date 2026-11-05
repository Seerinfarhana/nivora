from fastapi import APIRouter, Depends, HTTPException
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


class GoalPatch(BaseModel):
    name: str | None = None
    target: float | None = None
    saved: float | None = None
    due: str | None = None


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


@router.patch("/goals/{goal_id}")
def patch_goal(goal_id: int, body: GoalPatch, s: Session = Depends(get_session), u: User = Depends(current_user)):
    g = s.get(Goal, goal_id)
    if not g or g.user_id != u.id:
        raise HTTPException(404, "Goal not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(g, k, max(v, 0) if k in ("target", "saved") else v)
    s.add(g)
    s.commit()
    s.refresh(g)
    return g


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, s: Session = Depends(get_session), u: User = Depends(current_user)):
    g = s.get(Goal, goal_id)
    if not g or g.user_id != u.id:
        raise HTTPException(404, "Goal not found")
    s.delete(g)
    s.commit()
    return {"ok": True}


@router.get("/weekly")
def weekly(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.weekly_summary(s, u)


@router.get("/insights")
def insights(s: Session = Depends(get_session), u: User = Depends(current_user)):
    return tools.insights(s, u)


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
