"""Asset registry + maintenance flags."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Asset, User
from app.schemas.ops import AssetCreate, AssetRead, MaintenanceUpdate

router = APIRouter()
ANY = ("station", "logistics", "admin")
LOGI = ("logistics", "admin")


@router.get("", response_model=list[AssetRead])
async def list_assets(station_id: UUID | None = Query(None),
                      db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role(*ANY))):
    stmt = select(Asset).order_by(Asset.serial)
    if station_id:
        stmt = stmt.where(Asset.station_id == station_id)
    return [AssetRead.model_validate(a) for a in (await db.execute(stmt)).scalars().all()]


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
async def add_asset(body: AssetCreate,
                    db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_role(*LOGI))):
    asset = Asset(**body.model_dump())
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return AssetRead.model_validate(asset)


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(asset_id: UUID,
                    db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_role(*ANY))):
    asset = (await db.execute(select(Asset).where(Asset.id == asset_id))).scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="asset not found")
    return AssetRead.model_validate(asset)


@router.post("/{asset_id}/maintenance", response_model=AssetRead)
async def set_maintenance(asset_id: UUID, body: MaintenanceUpdate,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(require_role(*LOGI))):
    asset = (await db.execute(select(Asset).where(Asset.id == asset_id))).scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="asset not found")
    asset.maintenance_due = body.maintenance_due
    asset.next_maintenance = body.next_maintenance
    await db.commit()
    await db.refresh(asset)
    return AssetRead.model_validate(asset)

