"""Voyage records + crew assignment (PS#1 expedition planning)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import IntegrityError, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import CargoItem, Personnel, User, Voyage, VoyageAssignment
from app.schemas.voyages import AssignRequest, CrewRead, VoyageCreate, VoyageDetail, VoyageRead

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")
LOGISTICS = require_role("logistics", "admin")


@router.get("", response_model=list[VoyageRead])
async def list_voyages(db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    return (await db.execute(select(Voyage).order_by(Voyage.depart_date.nulls_last()))).scalars().all()


@router.post("", response_model=VoyageRead, status_code=status.HTTP_201_CREATED)
async def create_voyage(body: VoyageCreate, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    voyage = Voyage(**body.model_dump())
    db.add(voyage)
    await db.commit()
    await db.refresh(voyage)
    return voyage


@router.get("/{voyage_id}", response_model=VoyageDetail)
async def voyage_detail(voyage_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    voyage = await db.get(Voyage, voyage_id)
    if voyage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voyage not found")
    cargo = (await db.execute(select(CargoItem).where(CargoItem.voyage_id == voyage_id))).scalars().all()
    crew_stmt = (
        select(VoyageAssignment, Personnel)
        .join(Personnel, VoyageAssignment.personnel_id == Personnel.id)
        .where(VoyageAssignment.voyage_id == voyage_id)
    )
    crew = [
        CrewRead(personnel_id=p.id, full_name=p.full_name, role_on_board=a.role_on_board)
        for a, p in (await db.execute(crew_stmt)).all()
    ]
    return VoyageDetail(voyage=VoyageRead.model_validate(voyage), cargo=cargo, crew=crew)


@router.post("/{voyage_id}/assign", response_model=VoyageDetail)
async def assign_crew(voyage_id: uuid.UUID, body: AssignRequest, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    if await db.get(Voyage, voyage_id) is None or await db.get(Personnel, body.personnel_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voyage or personnel not found")
    db.add(VoyageAssignment(voyage_id=voyage_id, personnel_id=body.personnel_id,
                            role_on_board=body.role_on_board))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Person already assigned to this voyage")
    return await voyage_detail(voyage_id, db, user)