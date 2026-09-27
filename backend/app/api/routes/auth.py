"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.rbac import require_role
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRead

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify credentials and issue a JWT.
    The error message never says WHICH field was wrong (anti-enumeration)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return TokenResponse(
        access_token=security.create_access_token(str(user.id), user.role),
        role=user.role,
    )


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(require_role("station", "logistics", "admin"))):
    """Any authenticated role can read its own profile."""
    return user


@router.get("/admin-ping")
async def admin_ping(user: User = Depends(require_role("admin"))):
    """RBAC self-test: 200 for admin, 403 for station/logistics, 401 anonymous."""
    return {"ping": "pong", "as": user.email}