"""Stock snapshots + consumption logging (PS#3 inventory management)."""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, ConsumptionEvent, User
from app.schemas.cargo import CargoRead, ConsumptionCreate, ConsumptionRead

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")


@router.get("", response_model=list[CargoRead])
async def stock_snapshot(station_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    stmt = select(CargoItem).order_by(CargoItem.name)
    if station_id:
        stmt = stmt.where(CargoItem.station_id == station_id)
    return (await db.execute(stmt)).scalars().all()


@router.post("/consumption", response_model=CargoRead)
async def log_consumption(body: ConsumptionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_role("station", "logistics"))):
    item = await db.get(CargoItem, body.cargo_item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cargo item not found")
    if float(item.quantity or 0) < body.quantity:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient stock for this consumption")
    item.quantity = float(item.quantity) - body.quantity
    db.add(ConsumptionEvent(cargo_item_id=item.id, quantity=body.quantity,
                            consumed_by=user.id, notes=body.notes))
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/consumption", response_model=list[ConsumptionRead])
async def consumption_history(cargo_item_id: uuid.UUID = Query(...), days: int = Query(90, ge=1, le=730), db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    since = datetime.utcnow() - timedelta(days=days)
    stmt = (
        select(ConsumptionEvent)
        .where(ConsumptionEvent.cargo_item_id == cargo_item_id,
               ConsumptionEvent.consumed_at >= since)
        .order_by(ConsumptionEvent.consumed_at)
    )
    out = []
    for ev in (await db.execute(stmt)).scalars().all():
        row = ConsumptionRead.model_validate(ev)
        row.consumed_at = ev.consumed_at.isoformat() if ev.consumed_at else None
        out.append(row)
    return out