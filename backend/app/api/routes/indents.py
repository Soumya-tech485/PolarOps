"""Indent lifecycle = the heart of PS#2 cargo tracking.
requested -> cleared -> (stow: capacity+QR) -> shipped -> received | rejected
"""
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, Indent, User
from app.schemas.cargo import IndentClear, IndentCreate, IndentRead, IndentReceive, IndentStow
from app.services.cargo import assert_capacity

router = APIRouter()
LOGISTICS = require_role("logistics", "admin")
STATIONISH = require_role("station", "logistics", "admin")


def _read(indent: Indent) -> IndentRead:
    out = IndentRead.model_validate(indent)
    out.created_at = indent.created_at.isoformat() if indent.created_at else None
    return out


async def _get_indent(db: AsyncSession, indent_id: uuid.UUID) -> Indent:
    indent = await db.get(Indent, indent_id)
    if indent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Indent not found")
    return indent


def _expect(indent: Indent, *allowed: str) -> None:
    if indent.status not in allowed:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Indent is '{indent.status}', this step needs one of {allowed}",
        )


@router.post("", response_model=IndentRead, status_code=status.HTTP_201_CREATED)
async def create_indent(body: IndentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(STATIONISH)):
    if await db.get(CargoItem, body.cargo_item_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cargo item not found")
    indent = Indent(cargo_item_id=body.cargo_item_id, requested_qty=body.requested_qty, created_by=user.id)
    db.add(indent)
    await db.commit()
    await db.refresh(indent)
    return _read(indent)


@router.get("", response_model=list[IndentRead])
async def list_indents(status_filter: str | None = Query(None, alias="status"), db: AsyncSession = Depends(get_db), user: User = Depends(STATIONISH)):
    stmt = select(Indent).order_by(Indent.created_at)
    if status_filter:
        stmt = stmt.where(Indent.status == status_filter)
    return [_read(i) for i in (await db.execute(stmt)).scalars().all()]


@router.post("/{indent_id}/clear", response_model=IndentRead)
async def clear_indent(indent_id: uuid.UUID, body: IndentClear, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    indent = await _get_indent(db, indent_id)
    _expect(indent, "requested")
    indent.voyage_id = body.voyage_id
    indent.status = "cleared"
    indent.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _read(indent)


@router.post("/{indent_id}/stow", response_model=IndentRead)
async def stow_indent(indent_id: uuid.UUID, body: IndentStow, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    """Capacity gate + QR issue."""
    indent = await _get_indent(db, indent_id)
    _expect(indent, "cleared")
    if indent.voyage_id is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Clear the indent onto a voyage first")
    item = await db.get(CargoItem, indent.cargo_item_id)
    add_kg = float(indent.requested_qty) * float(item.weight_kg or 0)
    add_m3 = float(indent.requested_qty) * float(item.volume_m3 or 0)
    await assert_capacity(db, indent.voyage_id, add_kg, add_m3)
    indent.stow_position = body.stow_position
    indent.qr_token = secrets.token_urlsafe(16)
    indent.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _read(indent)


@router.post("/{indent_id}/ship", response_model=IndentRead)
async def ship_indent(indent_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    indent = await _get_indent(db, indent_id)
    _expect(indent, "cleared")
    if not indent.stow_position:
        raise HTTPException(status.HTTP_409_CONFLICT, "Stow the indent before shipping")
    indent.status = "shipped"
    indent.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _read(indent)


@router.post("/{indent_id}/receive", response_model=IndentRead)
async def receive_indent(indent_id: uuid.UUID, body: IndentReceive, db: AsyncSession = Depends(get_db), user: User = Depends(require_role("station", "logistics"))):
    """Scan-verify then credit station stock — closes the loop."""
    indent = await _get_indent(db, indent_id)
    _expect(indent, "shipped")
    if indent.qr_token != body.qr_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "QR token does not match this indent")
    item = await db.get(CargoItem, indent.cargo_item_id)
    item.quantity = float(item.quantity or 0) + float(indent.requested_qty)
    indent.status = "received"
    indent.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _read(indent)


@router.post("/{indent_id}/reject", response_model=IndentRead)
async def reject_indent(indent_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    indent = await _get_indent(db, indent_id)
    _expect(indent, "requested", "cleared")
    indent.status = "rejected"
    indent.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _read(indent)