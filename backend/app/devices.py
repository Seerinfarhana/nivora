from fastapi import Request
from sqlmodel import Session
from user_agents import parse

from .models import DeviceSession, User

GENERIC = {"", "k", "other", "generic smartphone", "generic feature phone", "spider"}


def create_session(s: Session, u: User, request: Request, device_model: str = "") -> DeviceSession:
    """Record the device that is signing in, from its User-Agent (plus the model the browser shares, if any)."""
    ua = parse(request.headers.get("user-agent", ""))
    os_name = f"{ua.os.family} {ua.os.version_string}".strip()
    if ua.is_mobile or ua.is_tablet:
        kind = "Tablet" if ua.is_tablet else "Phone"
        model = (device_model or ua.device.family or "").strip()
        if model.lower() in GENERIC:
            model = {"Android": "Android phone", "iOS": "iPhone"}.get(ua.os.family, "Mobile phone")
        name = model
    else:
        kind = "Computer"
        name = f"{ua.os.family} computer" if ua.os.family != "Other" else "Computer"
    d = DeviceSession(user_id=u.id, device_name=name, kind=kind, os=os_name, browser=ua.browser.family,
                      ip=request.client.host if request.client else "")
    s.add(d)
    s.commit()
    s.refresh(d)
    return d
