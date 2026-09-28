"""Admin-only audit read + chain verification (the tamper-detection demo)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.middleware.audit import verify_chain
from app.models import AuditLog, User
from app.schemas.ops import AuditRead, VerifyReport

router = APIRouter()
ADMIN = require_role("admin")


def _read(row: AuditLog) -> AuditRead:
    out = AuditRead.model_validate(row)
    out.ts = row.ts.isoformat() if row.ts else None
    return out


@router.get("", response_model=list[AuditRead])
async def list_audit(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), user: User = Depends(ADMIN)):
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit).offset(offset)
    return [_read(r) for r in (await db.execute(stmt)).scalars().all()]


@router.get("/verify", response_model=VerifyReport)
async def verify(db: AsyncSession = Depends(get_db), user: User = Depends(ADMIN)):
    """Re-walk the whole chain; judges press this after trying to tamper."""
    rows = list((await db.execute(select(AuditLog).order_by(AuditLog.id))).scalars().all())
    broken = verify_chain(rows)
    return VerifyReport(ok=broken is None, broken_at_id=broken, rows_checked=len(rows))