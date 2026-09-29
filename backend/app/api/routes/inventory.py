"""Stock view + consumption logging + history."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, ConsumptionEvent, User
from app.schemas.cargo import CargoRead
from app.schemas.ops import ConsumptionCreate, ConsumptionRead

router = APIRouter()
ANY = ("station", "logistics", "admin")


@router.get("", response_model=list[CargoRead])
async def stock(station_id: UUID | None = Query(None),
                db: AsyncSession = Depends(get_db),
                user: User = Depends(require_role(*ANY))):
    stmt = select(CargoItem).order_by(CargoItem.name)
    if station_id:
        stmt = stmt.where(CargoItem.station_id == station_id)
    return [CargoRead.model_validate(c) for c in (await db.execute(stmt)).scalars().all()]


@router.post("/consumption", response_model=CargoRead)
async def log_consumption(body: ConsumptionCreate,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(require_role(*ANY))):
    item = (await db.execute(select(CargoItem).where(CargoItem.id == body.cargo_item_id))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="cargo item not found")
    if (item.quantity or 0) < body.quantity:
        raise HTTPException(status_code=400, detail="insufficient stock")
    item.quantity = float(item.quantity or 0) - float(body.quantity)
    db.add(ConsumptionEvent(cargo_item_id=item.id, quantity=body.quantity,
                            consumed_by=user.id, notes=body.notes))
    await db.commit()
    await db.refresh(item)
    return CargoRead.model_validate(item)


@router.get("/consumption", response_model=list[ConsumptionRead])
async def consumption_history(cargo_item_id: UUID = Query(...),
                              days: int = Query(90, ge=1, le=730),
                              db: AsyncSession = Depends(get_db),
                              user: User = Depends(require_role(*ANY))):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(ConsumptionEvent)
        .where(ConsumptionEvent.cargo_item_id == cargo_item_id,
               ConsumptionEvent.consumed_at >= since)
        .order_by(ConsumptionEvent.consumed_at))
    return [ConsumptionRead.model_validate(ev) for ev in result.scalars().all()]
