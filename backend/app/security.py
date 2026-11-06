from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from .config import ALGORITHM, SECRET_KEY, TOKEN_MINUTES
from .db import get_session
from .models import DeviceSession, User

bearer = HTTPBearer()


def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(user: User, sid: int) -> str:
    """sid is the id of the device session this sign-in created."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    return jwt.encode({"sub": str(user.id), "sid": sid, "role": user.role, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def _decode(cred: HTTPAuthorizationCredentials) -> dict:
    try:
        return jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")


def current_sid(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    return int(_decode(cred).get("sid", 0))


def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    data = _decode(cred)
    user = session.get(User, int(data["sub"]))
    dev = session.get(DeviceSession, int(data.get("sid", 0)))
    if not user or not dev or dev.revoked or dev.user_id != user.id:
        raise HTTPException(401, "Session ended. Please sign in again.")
    dev.last_active = datetime.now()
    session.add(dev)
    session.commit()
    return user


def admin_only(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user
