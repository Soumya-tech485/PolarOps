"""Voyage load math — the single place capacity is computed."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CargoItem, Indent, Voyage

LOAD_BEARING = ("cleared", "shipped", "received")


async def voyage_load(db: AsyncSession, voyage_id: uuid.UUID) -> tuple[float, float]:
    """Return (kg, m3) currently committed to a voyage via indents."""
    stmt = (
        select(
            func.coalesce(func.sum(Indent.requested_qty * CargoItem.weight_kg), 0),
            func.coalesce(func.sum(Indent.requested_qty * CargoItem.volume_m3), 0),
        )
        .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
        .where(Indent.voyage_id == voyage_id, Indent.status.in_(LOAD_BEARING))
    )
    kg, m3 = (await db.execute(stmt)).one()
    return float(kg), float(m3)


async def assert_capacity(
    db: AsyncSession, voyage_id: uuid.UUID, add_kg: float, add_m3: float
) -> Voyage:
    """Raise 409 if adding this cargo would exceed the icebreaker's limits."""
    voyage = await db.get(Voyage, voyage_id)
    if voyage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voyage not found")
    kg, m3 = await voyage_load(db, voyage_id)
    if voyage.capacity_kg is not None and kg + add_kg > float(voyage.capacity_kg):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Weight capacity exceeded: {kg + add_kg:.0f}kg > {voyage.capacity_kg}kg",
        )
    if voyage.capacity_m3 is not None and m3 + add_m3 > float(voyage.capacity_m3):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Volume capacity exceeded: {m3 + add_m3:.2f}m3 > {voyage.capacity_m3}m3",
        )
    return voyage