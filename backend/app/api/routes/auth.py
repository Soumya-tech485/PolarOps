"""Login / me / admin-ping."""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import require_role
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRead

router = APIRouter()
ANY = ("station", "logistics", "admin")


def _token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if user is None or not bcrypt.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return TokenResponse(access_token=_token(user), role=user.role)


@router.get("/me", response_model=UserRead)
async def me(db: AsyncSession = Depends(get_db), user: User = Depends(require_role(*ANY))):
    return UserRead.model_validate(user)


@router.get("/admin-ping")
async def admin_ping(user: User = Depends(require_role("admin"))):
    return {"ping": "pong"}
