"""Station list."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Station, User
from app.schemas.voyages import StationRead

router = APIRouter()


@router.get("", response_model=list[StationRead])
async def list_stations(db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role("station", "logistics", "admin"))):
    result = await db.execute(select(Station).order_by(Station.code))
    return [StationRead.model_validate(s) for s in result.scalars().all()]
