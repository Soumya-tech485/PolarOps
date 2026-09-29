"""Indent lifecycle with capacity gate + QR receive."""
import uuid as uuidlib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, Indent, User, Voyage
from app.schemas.cargo import (IndentClear, IndentCreate, IndentRead,
                               IndentReceive, IndentStow)

router = APIRouter()
ANY = ("station", "logistics", "admin")
LOGI = ("logistics", "admin")


def _read(i: Indent) -> IndentRead:
    return IndentRead.model_validate(i)


async def _get(db: AsyncSession, indent_id: UUID) -> Indent:
    indent = (await db.execute(select(Indent).where(Indent.id == indent_id))).scalar_one_or_none()
    if indent is None:
        raise HTTPException(status_code=404, detail="indent not found")
    return indent


@router.post("", response_model=IndentRead)
async def create_indent(body: IndentCreate,
                        db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*ANY))):
    item = (await db.execute(select(CargoItem).where(CargoItem.id == body.cargo_item_id))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="cargo item not found")
    indent = Indent(cargo_item_id=body.cargo_item_id, requested_qty=body.requested_qty,
                    created_by=user.id, status="requested")
    db.add(indent)
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.get("", response_model=list[IndentRead])
async def list_indents(status: str | None = Query(None),
                       db: AsyncSession = Depends(get_db),
                       user: User = Depends(require_role(*ANY))):
    stmt = select(Indent).order_by(Indent.created_at.desc())
    if status:
        stmt = stmt.where(Indent.status == status)
    return [_read(i) for i in (await db.execute(stmt)).scalars().all()]


@router.get("/{indent_id}", response_model=IndentRead)
async def get_indent(indent_id: UUID, db: AsyncSession = Depends(get_db),
                     user: User = Depends(require_role(*ANY))):
    return _read(await _get(db, indent_id))


@router.post("/{indent_id}/clear", response_model=IndentRead)
async def clear_indent(indent_id: UUID, body: IndentClear,
                       db: AsyncSession = Depends(get_db),
                       user: User = Depends(require_role(*LOGI))):
    indent = await _get(db, indent_id)
    if indent.status != "requested":
        raise HTTPException(status_code=409, detail=f"indent is '{indent.status}', needs 'requested'")
    voyage = (await db.execute(select(Voyage).where(Voyage.id == body.voyage_id))).scalar_one_or_none()
    if voyage is None:
        raise HTTPException(status_code=404, detail="voyage not found")
    indent.status = "cleared"
    indent.voyage_id = voyage.id
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.post("/{indent_id}/stow", response_model=IndentRead)
async def stow_indent(indent_id: UUID, body: IndentStow,
                      db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role(*LOGI))):
    indent = await _get(db, indent_id)
    if indent.status != "cleared":
        raise HTTPException(status_code=409, detail=f"indent is '{indent.status}', needs 'cleared'")
    voyage = (await db.execute(select(Voyage).where(Voyage.id == indent.voyage_id))).scalar_one_or_none()
    if voyage is None:
        raise HTTPException(status_code=409, detail="indent has no voyage")

    others = await db.execute(
        select(CargoItem.weight_kg, CargoItem.volume_m3, Indent.requested_qty)
        .join(Indent, Indent.cargo_item_id == CargoItem.id)
        .where(Indent.voyage_id == indent.voyage_id,
               Indent.status.in_(["cleared", "shipped"]),
               Indent.id != indent.id))
    used_kg = sum((r[0] or 0) * (r[2] or 0) for r in others.all())
    used_m3 = sum((r[1] or 0) * (r[2] or 0) for r in others.all())
    item = (await db.execute(select(CargoItem).where(CargoItem.id == indent.cargo_item_id))).scalar_one()
    add_kg = (item.weight_kg or 0) * indent.requested_qty
    add_m3 = (item.volume_m3 or 0) * indent.requested_qty
    if voyage.capacity_kg is not None and used_kg + add_kg > float(voyage.capacity_kg):
        raise HTTPException(status_code=409, detail="voyage weight capacity exceeded")
    if voyage.capacity_m3 is not None and used_m3 + add_m3 > float(voyage.capacity_m3):
        raise HTTPException(status_code=409, detail="voyage volume capacity exceeded")

    indent.stow_position = body.stow_position
    indent.qr_token = uuidlib.uuid4().hex
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.post("/{indent_id}/ship", response_model=IndentRead)
async def ship_indent(indent_id: UUID, db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role(*LOGI))):
    indent = await _get(db, indent_id)
    if indent.status != "cleared" or not indent.stow_position:
        raise HTTPException(status_code=409, detail="indent must be cleared and stowed before shipping")
    indent.status = "shipped"
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.post("/{indent_id}/receive", response_model=IndentRead)
async def receive_indent(indent_id: UUID, body: IndentReceive,
                         db: AsyncSession = Depends(get_db),
                         user: User = Depends(require_role(*ANY))):
    indent = await _get(db, indent_id)
    if indent.status != "shipped":
        raise HTTPException(status_code=409, detail=f"indent is '{indent.status}', needs 'shipped'")
    if indent.qr_token != body.qr_token:
        raise HTTPException(status_code=400, detail="QR token mismatch")
    indent.status = "received"
    item = (await db.execute(select(CargoItem).where(CargoItem.id == indent.cargo_item_id))).scalar_one()
    item.quantity = (item.quantity or 0) + indent.requested_qty
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.post("/{indent_id}/reject", response_model=IndentRead)
async def reject_indent(indent_id: UUID, db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*LOGI))):
    indent = await _get(db, indent_id)
    if indent.status not in ("requested", "cleared"):
        raise HTTPException(status_code=409, detail=f"indent is '{indent.status}', cannot reject")
    indent.status = "rejected"
    await db.commit()
    await db.refresh(indent)
    return _read(indent)