import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..config import (ALGORITHM, OTP_MAX_PER_HOUR, OTP_MAX_TRIES, OTP_MINUTES, OTP_RESEND_SECONDS, SECRET_KEY)
from ..db import get_session
from ..mailer import send_otp_email
from ..models import OtpCode, User
from ..sms import send_sms, sms_enabled

router = APIRouter()


class SendIn(BaseModel):
    email: str
    phone: str = ""


class VerifyIn(BaseModel):
    email: str
    code: str


def _hash(email: str, code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def check_otp_token(token: str, email: str) -> bool:
    """Used by /register: was this email verified in the last 15 minutes?"""
    try:
        d = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return False
    return d.get("purpose") == "register" and d.get("email") == email.strip().lower()


@router.post("/send")
def send(body: SendIn, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Enter a valid email address")
    if body.phone and not (body.phone.isdigit() and len(body.phone) == 10):
        raise HTTPException(400, "Enter a 10-digit mobile number")
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email is already registered. Try signing in.")
    now = datetime.now()
    recent = s.exec(select(OtpCode).where(OtpCode.email == email, OtpCode.created_at >= now - timedelta(hours=1))
                    .order_by(OtpCode.created_at.desc())).all()
    if recent and (now - recent[0].created_at).total_seconds() < OTP_RESEND_SECONDS:
        wait = OTP_RESEND_SECONDS - int((now - recent[0].created_at).total_seconds())
        raise HTTPException(429, f"Please wait {wait} seconds before asking for another code.")
    if len(recent) >= OTP_MAX_PER_HOUR:
        raise HTTPException(429, "Too many codes requested. Please try again in an hour.")

    code = f"{secrets.randbelow(10 ** 6):06d}"
    s.add(OtpCode(email=email, code_hash=_hash(email, code), expires_at=now + timedelta(minutes=OTP_MINUTES)))
    s.commit()

    sent, dev = [], False
    mail = send_otp_email(email, code, OTP_MINUTES)
    if mail == "sent":
        sent.append("email")
    dev = mail == "dev"
    if body.phone and sms_enabled() and send_sms(body.phone, f"Your NIVORA code is {code}. It expires in {OTP_MINUTES} minutes. Do not share it."):
        sent.append("sms")
    if not sent and not dev:
        raise HTTPException(503, "We could not send the code right now. Please try again in a minute.")
    return {"sent": sent, "dev_console": dev and not sent, "expires_in": OTP_MINUTES * 60, "resend_in": OTP_RESEND_SECONDS}


@router.post("/verify")
def verify(body: VerifyIn, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    row = s.exec(select(OtpCode).where(OtpCode.email == email, OtpCode.used == False)  # noqa: E712
                 .order_by(OtpCode.created_at.desc())).first()
    if not row or row.expires_at < datetime.now() or row.tries >= OTP_MAX_TRIES:
        raise HTTPException(400, "This code has expired. Please ask for a new one.")
    row.tries += 1
    if not hmac.compare_digest(row.code_hash, _hash(email, body.code.strip())):
        s.add(row)
        s.commit()
        left = OTP_MAX_TRIES - row.tries
        raise HTTPException(400, "That code is not right." + (f" {left} tries left." if left else " Please ask for a new code."))
    row.used = True
    s.add(row)
    s.commit()
    exp = datetime.now(timezone.utc) + timedelta(minutes=15)
    return {"otp_token": jwt.encode({"purpose": "register", "email": email, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)}
