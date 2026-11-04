from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import Account, User
from ..security import check_pw, current_user, hash_pw, make_token

router = APIRouter()


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    language: str = "en"


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    name: str | None = None
    phone: str | None = None
    language: str | None = None


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
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email is already registered")
    u = User(name=body.name.strip(), email=email, phone=body.phone, language=body.language,
             password_hash=hash_pw(body.password), pin_hash=hash_pw("1234"))  # demo PIN, let users change it later
    s.add(u)
    s.commit()
    s.refresh(u)
    s.add(Account(user_id=u.id, type="Savings", number=f"•••• {1000 + u.id * 37}", balance=0))
    s.commit()
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
