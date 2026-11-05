import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import tools
from ..db import get_session
from ..models import User
from ..seed import starter_data
from ..security import check_pw, current_user, hash_pw, make_token

router = APIRouter()


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    pin: str
    phone: str = ""
    language: str = "en"


class ChangePinIn(BaseModel):
    current_pin: str
    new_pin: str


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    name: str | None = None
    phone: str | None = None
    language: str | None = None


def _check_pin_format(pin: str):
    if not re.fullmatch(r"\d{4,6}", pin):
        raise HTTPException(400, "PIN must be 4 to 6 digits")
    if len(set(pin)) == 1:
        raise HTTPException(400, "Choose a PIN that is not all the same digit")


def _out(u: User):
    return {"token": make_token(u), "user": _public(u)}


def _public(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role,
            "language": u.language, "card_blocked": u.card_blocked}


@router.post("/register")
def register(body: RegisterIn, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    _check_pin_format(body.pin)
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email is already registered")
    u = User(name=body.name.strip(), email=email, phone=body.phone, language=body.language,
             password_hash=hash_pw(body.password), pin_hash=hash_pw(body.pin))
    s.add(u)
    s.commit()
    s.refresh(u)
    starter_data(s, u)
    return _out(u)


@router.post("/login")
def login(body: LoginIn, s: Session = Depends(get_session)):
    u = s.exec(select(User).where(User.email == body.email.strip().lower())).first()
    if not u or not check_pw(body.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return _out(u)


@router.get("/me")
def me(u: User = Depends(current_user)):
    return _public(u)


@router.patch("/me")
def update_me(body: ProfileIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(u, k, v)
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

