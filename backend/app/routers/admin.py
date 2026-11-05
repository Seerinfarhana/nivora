from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import AuditLog, Goal, User
from ..security import admin_only

router = APIRouter()


@router.get("/overview")
def overview(s: Session = Depends(get_session), _: User = Depends(admin_only)):
    customers = s.exec(select(User).where(User.role == "customer")).all()
    logs = s.exec(select(AuditLog).order_by(AuditLog.created_at.desc())).all()
    intents: dict[str, int] = {}
    for l in logs:
        key = l.intent.split(" ₹")[0]
        intents[key] = intents.get(key, 0) + 1
    return {
        "customers": len(customers),
        "assistant_actions": len(logs),
        "blocked": sum(1 for l in logs if l.status == "Blocked"),
        "needs_review": sum(1 for l in logs if l.status == "Review"),
        "intents": [{"name": k, "n": v} for k, v in sorted(intents.items(), key=lambda x: -x[1])],
        "audit": [{"t": l.created_at.strftime("%H:%M"), "user": f"C-{l.user_id or 0:05d}", "intent": l.intent,
                   "action": l.action, "status": l.status} for l in logs[:50]],
    }


@router.get("/customers")
def customers(s: Session = Depends(get_session), _: User = Depends(admin_only)):
    users = s.exec(select(User).where(User.role == "customer")).all()
    logs = s.exec(select(AuditLog)).all()
    goals = s.exec(select(Goal)).all()
    rows = []
    for u in users:
        mine = [l for l in logs if l.user_id == u.id]
        g = [x for x in goals if x.user_id == u.id]
        rows.append({"id": f"C-{u.id:05d}", "name": u.name, "email": u.email, "language": u.language,
                     "actions": len(mine), "blocked": sum(1 for l in mine if l.status == "Blocked"),
                     "goals": len(g), "goal_saved": round(sum(x.saved for x in g), 2), "goal_target": round(sum(x.target for x in g), 2)})
    return rows

