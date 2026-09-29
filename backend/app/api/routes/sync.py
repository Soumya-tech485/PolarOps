"""POST /sync/batch — the door the outbox queue knocks on."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import User
from app.schemas.sync import SyncBatch, SyncResult
from app.services import sync_engine

router = APIRouter()


@router.post("/batch", response_model=SyncResult)
async def batch(
    body: SyncBatch,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("station", "logistics", "admin")),
):
    result = await sync_engine.apply_batch(db, body.ops, user.id)
    request.state.audit = {"applied": len(result["applied"]),
                           "duplicates": len(result["skipped_duplicate"]),
                           "conflicts": len(result["conflicts"])}
    return result