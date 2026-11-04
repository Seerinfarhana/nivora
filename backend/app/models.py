from datetime import datetime
from typing import Optional
from pydantic import NaiveDatetime
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    phone: str = ""
    password_hash: str
    pin_hash: str = ""
    role: str = "customer"  # customer | admin
    language: str = "en"
    card_blocked: bool = False


class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    type: str
    number: str  # already masked, e.g. "•••• 4821"
    balance: float = 0


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    account_id: Optional[int] = None
    name: str
    category: str
    amount: float  # negative = money out
    created_at: NaiveDatetime = Field(default_factory=datetime.now)


class Beneficiary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str
    account_no: str


class Goal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str
    target: float
    saved: float = 0
    due: str = ""


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    user_id: Optional[int] = None
    intent: str
    action: str
    status: str  # Approved | Blocked | Review
