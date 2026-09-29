"""Audit ledger read + chain verification (admin only)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.middleware.audit import verify_chain
from app.models import AuditLog, User
from app.schemas.ops import AuditRead, VerifyReport

router = APIRouter()


@router.get("", response_model=list[AuditRead])
async def list_audit(db: AsyncSession = Depends(get_db),
                     user: User = Depends(require_role("admin"))):
    result = await db.execute(select(AuditLog).order_by(AuditLog.id))
    return [AuditRead.model_validate(r) for r in result.scalars().all()]


@router.get("/verify", response_model=VerifyReport)
async def verify(db: AsyncSession = Depends(get_db),
                 user: User = Depends(require_role("admin"))):
    result = await db.execute(select(AuditLog).order_by(AuditLog.id))
    rows = result.scalars().all()
    broken = verify_chain(rows)
    return VerifyReport(ok=broken is None, broken_at_id=broken, rows_checked=len(rows))
