"""Packing manifest endpoint — the 'mathematics, not guesswork' demo button."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import User
from app.schemas.intelligence import PackingManifest, PackingRequest
from app.services import optimizer

router = APIRouter()


@router.post("/packing", response_model=PackingManifest)
async def pack_voyage(body: PackingRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_role("logistics", "admin"))):
    """apply=false previews the manifest; apply=true writes stow + QR tokens."""
    return await optimizer.solve_loading(db, body.voyage_id, body.apply)