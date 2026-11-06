import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
TOKEN_MINUTES = 60 * 12
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nivora.db")
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
DEFAULT_TRANSFER_LIMIT = 100000  # rupees, each customer can change theirs in Profile & security
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
RESET_MINUTES = 30

# One-time codes at sign-up
OTP_REQUIRED = os.getenv("OTP_REQUIRED", "true").lower() != "false"
OTP_MINUTES = 10
OTP_MAX_TRIES = 5
OTP_RESEND_SECONDS = 30
OTP_MAX_PER_HOUR = 5

# Optional SMS (Twilio). Email is the default channel because it needs no paperwork.
TWILIO_SID = os.getenv("TWILIO_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "")
TWILIO_FROM = os.getenv("TWILIO_FROM", "")

# AI assistant (Claude API). Leave the key empty and the rule-based assistant is used instead.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5")
LLM_WEB_SEARCH = os.getenv("LLM_WEB_SEARCH", "true").lower() != "false"
LLM_MAX_PER_MINUTE = 15

# First payment to someone you have never paid before is capped (rupees)
NEW_PAYEE_LIMIT = 10000

# Optional email for "Forgot password". Leave SMTP_HOST empty in development:
# the reset link is then printed in the server console instead of emailed.
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER
