"""Assets + the maintenance flag that powers the optimizer exclusion rule."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Asset, Station, User
from app.schemas.ops import AssetCreate, AssetRead, MaintenanceUpdate

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")
LOGISTICS = require_role("logistics", "admin")


@router.get("", response_model=list[AssetRead])
async def list_assets(station_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    stmt = select(Asset).order_by(Asset.name)
    if station_id:
        stmt = stmt.where(Asset.station_id == station_id)
    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
async def add_asset(body: AssetCreate, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    if body.station_id and await db.get(Station, body.station_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Station not found")
    asset = Asset(**body.model_dump())
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(asset_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    asset = await db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


@router.post("/{asset_id}/maintenance", response_model=AssetRead)
async def set_maintenance(asset_id: uuid.UUID, body: MaintenanceUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    """Flip the flag the CP-SAT optimizer refuses to ship around (locked rule)."""
    asset = await db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    asset.maintenance_due = body.maintenance_due
    asset.next_maintenance = body.next_maintenance
    await db.commit()
    return asset