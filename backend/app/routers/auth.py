import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from .. import tools
from ..config import DEFAULT_TRANSFER_LIMIT, FRONTEND_URL, OTP_REQUIRED, RESET_MINUTES
from ..db import get_session
from ..devices import create_session
from ..mailer import send_reset_email
from ..models import (Account, AuditLog, Beneficiary, DeviceSession, Goal, OtpCode, PinGuard, Transaction, User)
from .otp import check_otp_token
from ..security import check_pw, current_sid, current_user, hash_pw, make_token

router = APIRouter()


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    pin: str
    phone: str = ""
    language: str = "en"
    device_model: str = ""
    otp_token: str = ""


class ChangePinIn(BaseModel):
    current_pin: str
    new_pin: str


class LoginIn(BaseModel):
    email: str
    password: str
    device_model: str = ""


class ProfileIn(BaseModel):
    name: str | None = None
    phone: str | None = None
    txn_limit: float | None = Field(default=None, ge=1000, le=1_000_000)
    prefs: dict | None = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountIn(BaseModel):
    password: str
    confirm: str


class ForgotIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    new_password: str


def _check_pin_format(pin: str):
    if not re.fullmatch(r"\d{4,6}", pin):
        raise HTTPException(400, "PIN must be 4 to 6 digits")
    if len(set(pin)) == 1:
        raise HTTPException(400, "Choose a PIN that is not all the same digit")


def _out(u: User, sid: int):
    return {"token": make_token(u, sid), "user": _public(u)}


def _public(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role,
            "language": u.language, "card_blocked": u.card_blocked, "txn_limit": u.txn_limit or DEFAULT_TRANSFER_LIMIT,
            "prefs": json.loads(u.prefs or "{}"), "onboarded": u.onboarded, "user_type": u.user_type}


def _sha(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _check_password(p: str):
    if len(p) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")


@router.post("/register")
def register(body: RegisterIn, request: Request, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    _check_password(body.password)
    if OTP_REQUIRED and not check_otp_token(body.otp_token, email):
        raise HTTPException(400, "Please verify your email with the code we sent before creating your account")
    _check_pin_format(body.pin)
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email is already registered")
    u = User(name=body.name.strip(), email=email, phone=body.phone, language="en",
             password_hash=hash_pw(body.password), pin_hash=hash_pw(body.pin))
    s.add(u)
    s.commit()
    s.refresh(u)
    # A brand new customer starts empty: no balance, no spending. Onboarding collects the real numbers.
    s.add(Account(user_id=u.id, type="Savings", number=f"•••• {1000 + u.id * 37}", balance=0))
    s.commit()
    d = create_session(s, u, request, body.device_model)
    return _out(u, d.id)


@router.post("/login")
def login(body: LoginIn, request: Request, s: Session = Depends(get_session)):
    u = s.exec(select(User).where(User.email == body.email.strip().lower())).first()
    if not u or not check_pw(body.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    d = create_session(s, u, request, body.device_model)
    return _out(u, d.id)


@router.post("/logout")
def logout(sid: int = Depends(current_sid), s: Session = Depends(get_session)):
    d = s.get(DeviceSession, sid)
    if d:
        d.revoked = True
        s.add(d)
        s.commit()
    return {"ok": True}


@router.get("/me")
def me(u: User = Depends(current_user)):
    return _public(u)


@router.patch("/me")
def update_me(body: ProfileIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    data = body.model_dump(exclude_none=True)
    if "name" in data:
        if len(data["name"].strip()) < 2:
            raise HTTPException(400, "Enter your full name")
        u.name = data["name"].strip()
    if "phone" in data:
        if data["phone"] and not re.fullmatch(r"\d{10}", data["phone"]):
            raise HTTPException(400, "Enter a 10-digit mobile number")
        u.phone = data["phone"]
    if "txn_limit" in data:
        u.txn_limit = data["txn_limit"]
    if "prefs" in data:
        u.prefs = json.dumps({**json.loads(u.prefs or "{}"), **data["prefs"]})
    s.add(u)
    s.commit()
    return _public(u)


@router.post("/change-pin")
def change_pin(body: ChangePinIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    _check_pin_format(body.new_pin)
    r = tools.verify_pin(s, u, body.current_pin)
    if not r["ok"]:
        raise HTTPException(423 if r["locked"] else 400, r["reason"])
    u.pin_hash = hash_pw(body.new_pin)
    s.add(u)
    s.commit()
    tools.log(s, u, "Change PIN", "Transaction PIN updated", "Approved")
    return {"ok": True}


@router.post("/change-password")
def change_password(body: ChangePasswordIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    if not check_pw(body.current_password, u.password_hash):
        raise HTTPException(400, "Your current password is incorrect")
    _check_password(body.new_password)
    u.password_hash = hash_pw(body.new_password)
    s.add(u)
    s.commit()
    tools.log(s, u, "Change password", "Password updated", "Approved")
    return {"ok": True}


@router.post("/forgot")
def forgot(body: ForgotIn, s: Session = Depends(get_session)):
    u = s.exec(select(User).where(User.email == body.email.strip().lower())).first()
    if u:
        token = secrets.token_urlsafe(32)
        u.reset_hash = _sha(token)
        u.reset_expires = datetime.now() + timedelta(minutes=RESET_MINUTES)
        s.add(u)
        s.commit()
        send_reset_email(u.email, f"{FRONTEND_URL}/reset?token={token}")
    # Same answer whether or not the email exists, so nobody can probe for accounts.
    return {"message": "If that email is registered, we have sent a reset link."}


@router.post("/reset")
def reset(body: ResetIn, s: Session = Depends(get_session)):
    _check_password(body.new_password)
    u = s.exec(select(User).where(User.reset_hash == _sha(body.token))).first()
    if not body.token or not u or not u.reset_expires or u.reset_expires < datetime.now():
        raise HTTPException(400, "This reset link is invalid or has expired")
    u.password_hash = hash_pw(body.new_password)
    u.reset_hash, u.reset_expires = "", None
    s.add(u)
    for d in s.exec(select(DeviceSession).where(DeviceSession.user_id == u.id)).all():
        d.revoked = True  # a reset signs the account out everywhere
        s.add(d)
    s.commit()
    tools.log(s, u, "Reset password", "Password reset with an email link", "Approved")
    return {"ok": True}


@router.get("/sessions")
def sessions(sid: int = Depends(current_sid), u: User = Depends(current_user), s: Session = Depends(get_session)):
    rows = s.exec(select(DeviceSession).where(DeviceSession.user_id == u.id, DeviceSession.revoked == False)  # noqa: E712
                  .order_by(DeviceSession.last_active.desc())).all()
    return [{"id": d.id, "device": d.device_name, "kind": d.kind, "os": d.os, "browser": d.browser, "ip": d.ip,
             "signed_in": d.created_at.isoformat(), "last_active": d.last_active.isoformat(), "current": d.id == sid}
            for d in rows]


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: int, u: User = Depends(current_user), s: Session = Depends(get_session)):
    d = s.get(DeviceSession, session_id)
    if not d or d.user_id != u.id:
        raise HTTPException(404, "Device not found")
    d.revoked = True
    s.add(d)
    s.commit()
    return {"ok": True}


@router.post("/delete-account")
def delete_account(body: DeleteAccountIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    """Permanently deletes the signed-in customer and everything that belongs to them."""
    if u.role == "admin":
        raise HTTPException(403, "Admin accounts cannot be deleted here")
    if body.confirm.strip() != "DELETE":
        raise HTTPException(400, "Type DELETE to confirm")
    if not check_pw(body.password, u.password_hash):
        tools.log(s, u, "Delete account", "Wrong password", "Blocked")
        raise HTTPException(400, "Your password is incorrect")
    tools.PENDING.pop(u.id, None)
    for model in (Goal, Beneficiary, Transaction, Account, DeviceSession):
        for row in s.exec(select(model).where(model.user_id == u.id)).all():
            s.delete(row)
    for row in s.exec(select(OtpCode).where(OtpCode.email == u.email)).all():
        s.delete(row)
    guard = s.get(PinGuard, u.id)
    if guard:
        s.delete(guard)
    for row in s.exec(select(AuditLog).where(AuditLog.user_id == u.id)).all():
        row.user_id = None  # the bank keeps an anonymous audit trail
        s.add(row)
    s.delete(u)
    s.commit()
    return {"ok": True}
