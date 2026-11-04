from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import AuditLog, User
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
                   "action": l.action, "status": l.status} for l in logs[:20]],
    }
