"""Cargo item CRUD + voyage loading manifest (PS#2)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, Indent, User
from app.schemas.cargo import CargoCreate, CargoRead, ManifestLine

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")


@router.get("", response_model=list[CargoRead])
async def list_cargo(
    station_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(ANY_ROLE),
):
    stmt = select(CargoItem)
    if station_id:
        stmt = stmt.where(CargoItem.station_id == station_id)
    stmt = stmt.order_by(CargoItem.priority, CargoItem.name)
    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=CargoRead, status_code=status.HTTP_201_CREATED)
async def create_cargo(
    body: CargoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("logistics", "admin")),
):
    item = CargoItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


# "/manifest" MUST be declared before "/{item_id}" (route-ordering rule).
@router.get("/manifest", response_model=list[ManifestLine])
async def voyage_manifest(
    voyage_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(ANY_ROLE),
):
    stmt = (
        select(Indent, CargoItem)
        .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
        .where(Indent.voyage_id == voyage_id,
               Indent.status.in_(("cleared", "shipped", "received")))
        .order_by(Indent.stow_position.nulls_last(), CargoItem.priority)
    )
    rows = (await db.execute(stmt)).all()
    return [
        ManifestLine(indent_id=indent.id, item_name=item.name, box_label=item.box_label,
                     qty=float(indent.requested_qty), stow_position=indent.stow_position,
                     status=indent.status)
        for indent, item in rows
    ]


@router.get("/{item_id}", response_model=CargoRead)
async def get_cargo(item_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    item = await db.get(CargoItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cargo item not found")
    return item