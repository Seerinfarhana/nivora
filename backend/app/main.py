from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import FRONTEND_ORIGINS
from .db import init_db
from .routers import admin, assistant, auth, banking, external, otp, profile
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


app = FastAPI(title="NIVORA API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=FRONTEND_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(banking.router, prefix="/api", tags=["banking"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(otp.router, prefix="/api/otp", tags=["otp"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(external.router, prefix="/api/external", tags=["external"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
