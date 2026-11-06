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
    txn_limit: float = 100000
    prefs: str = "{}"  # JSON: notification and display preferences

    # What the customer told us during onboarding
    onboarded: bool = False
    user_type: str = "individual"  # individual | business
    monthly_income: float = 0
    monthly_revenue: float = 0
    monthly_spend: float = 0
    investments: str = ""  # comma separated

    # Forgot password
    reset_hash: str = ""
    reset_expires: Optional[NaiveDatetime] = None


class DeviceSession(SQLModel, table=True):
    """One row per sign-in, so Security can list real devices and sign them out."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    device_name: str
    kind: str = "Computer"  # Computer | Phone | Tablet
    os: str = ""
    browser: str = ""
    ip: str = ""
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    last_active: NaiveDatetime = Field(default_factory=datetime.now)
    revoked: bool = False


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
    source: str = "bank"  # bank | declared (typed in by the customer during onboarding)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)


class Beneficiary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str
    account_no: str
    upi_id: str = ""
    phone: str = ""


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


class PinGuard(SQLModel, table=True):
    """Counts wrong PIN attempts and holds the lock time (one row per user)."""
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    failures: int = 0
    locked_until: Optional[NaiveDatetime] = None


class OtpCode(SQLModel, table=True):
    """A one-time code sent at sign-up. Only a keyed hash of the code is stored."""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    code_hash: str
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    expires_at: NaiveDatetime
    tries: int = 0
    used: bool = False
