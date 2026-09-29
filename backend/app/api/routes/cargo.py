"""Cargo items + voyage manifest. NOTE: /manifest declared BEFORE /{item_id}."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, Indent, User
from app.schemas.cargo import CargoCreate, CargoRead, ManifestLine

router = APIRouter()
ANY = ("station", "logistics", "admin")
LOGI = ("logistics", "admin")


@router.get("", response_model=list[CargoRead])
async def list_cargo(station_id: UUID | None = Query(None),
                     db: AsyncSession = Depends(get_db),
                     user: User = Depends(require_role(*ANY))):
    stmt = select(CargoItem).order_by(CargoItem.name)
    if station_id:
        stmt = stmt.where(CargoItem.station_id == station_id)
    return [CargoRead.model_validate(c) for c in (await db.execute(stmt)).scalars().all()]


@router.post("", response_model=CargoRead, status_code=status.HTTP_201_CREATED)
async def create_cargo(body: CargoCreate,
                       db: AsyncSession = Depends(get_db),
                       user: User = Depends(require_role(*LOGI))):
    item = CargoItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return CargoRead.model_validate(item)


@router.get("/manifest", response_model=list[ManifestLine])
async def manifest(voyage_id: UUID = Query(...),
                   db: AsyncSession = Depends(get_db),
                   user: User = Depends(require_role(*ANY))):
    result = await db.execute(
        select(Indent, CargoItem)
        .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
        .where(Indent.voyage_id == voyage_id,
               Indent.status.in_(["cleared", "shipped", "received"]))
        .order_by(CargoItem.box_label)
    )
    return [ManifestLine(indent_id=ind.id, item_name=item.name, box_label=item.box_label,
                         qty=ind.requested_qty, stow_position=ind.stow_position,
                         status=ind.status)
            for ind, item in result.all()]


@router.get("/{item_id}", response_model=CargoRead)
async def get_cargo(item_id: UUID,
                    db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_role(*ANY))):
    item = (await db.execute(select(CargoItem).where(CargoItem.id == item_id))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="cargo item not found")
    return CargoRead.model_validate(item)
