import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
TOKEN_MINUTES = 60 * 12
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nivora.db")
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
DAILY_TRANSFER_LIMIT = 100000  # rupees
