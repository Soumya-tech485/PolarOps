"""Voyages + idempotent crew assignment + voyage detail."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import (CargoItem, Indent, Personnel, User, Voyage,
                        VoyageAssignment)
from app.schemas.cargo import ManifestLine
from app.schemas.voyages import (AssignRequest, CrewRead, VoyageCreate,
                                 VoyageDetail, VoyageRead)

router = APIRouter()
ANY = ("station", "logistics", "admin")
LOGI = ("logistics", "admin")


async def _detail(db: AsyncSession, voyage: Voyage) -> VoyageDetail:
    cargo = await db.execute(
        select(Indent, CargoItem)
        .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
        .where(Indent.voyage_id == voyage.id,
               Indent.status.in_(["cleared", "shipped", "received"]))
        .order_by(CargoItem.box_label))
    crew = await db.execute(
        select(Personnel, VoyageAssignment.role_on_board)
        .join(VoyageAssignment, VoyageAssignment.personnel_id == Personnel.id)
        .where(VoyageAssignment.voyage_id == voyage.id))
    return VoyageDetail(
        voyage=VoyageRead.model_validate(voyage),
        cargo=[ManifestLine(indent_id=ind.id, item_name=item.name,
                            box_label=item.box_label, qty=ind.requested_qty,
                            stow_position=ind.stow_position, status=ind.status)
               for ind, item in cargo.all()],
        crew=[CrewRead(personnel_id=p.id, full_name=p.full_name, role_on_board=role)
              for p, role in crew.all()])


@router.get("", response_model=list[VoyageRead])
async def list_voyages(db: AsyncSession = Depends(get_db),
                       user: User = Depends(require_role(*ANY))):
    result = await db.execute(select(Voyage).order_by(Voyage.depart_date))
    return [VoyageRead.model_validate(v) for v in result.scalars().all()]


@router.post("", response_model=VoyageRead)
async def create_voyage(body: VoyageCreate,
                        db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*LOGI))):
    voyage = Voyage(**body.model_dump())
    db.add(voyage)
    await db.commit()
    await db.refresh(voyage)
    return VoyageRead.model_validate(voyage)


@router.get("/{voyage_id}", response_model=VoyageDetail)
async def voyage_detail(voyage_id: UUID,
                        db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*ANY))):
    voyage = (await db.execute(select(Voyage).where(Voyage.id == voyage_id))).scalar_one_or_none()
    if voyage is None:
        raise HTTPException(status_code=404, detail="voyage not found")
    return await _detail(db, voyage)


@router.post("/{voyage_id}/assign", response_model=VoyageDetail)
async def assign_crew(voyage_id: UUID, body: AssignRequest,
                      db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role(*LOGI))):
    voyage = (await db.execute(select(Voyage).where(Voyage.id == voyage_id))).scalar_one_or_none()
    if voyage is None:
        raise HTTPException(status_code=404, detail="voyage not found")
    person = (await db.execute(select(Personnel).where(Personnel.id == body.personnel_id))).scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=404, detail="personnel not found")
    existing = (await db.execute(select(VoyageAssignment).where(
        VoyageAssignment.voyage_id == voyage_id,
        VoyageAssignment.personnel_id == body.personnel_id))).scalar_one_or_none()
    if existing is not None:
        existing.role_on_board = body.role_on_board          # idempotent re-assign
    else:
        db.add(VoyageAssignment(voyage_id=voyage_id, personnel_id=body.personnel_id,
                                role_on_board=body.role_on_board))
    await db.commit()
    await db.refresh(voyage)
    return await _detail(db, voyage)
