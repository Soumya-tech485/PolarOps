"""Personnel roster + location pings."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Personnel, User
from app.schemas.ops import (PersonnelCreate, PersonnelLocationUpdate,
                             PersonnelRead)

router = APIRouter()
ANY = ("station", "logistics", "admin")
LOGI = ("logistics", "admin")


@router.get("", response_model=list[PersonnelRead])
async def list_personnel(station_id: UUID | None = Query(None),
                         status: str | None = Query(None),
                         db: AsyncSession = Depends(get_db),
                         user: User = Depends(require_role(*ANY))):
    stmt = select(Personnel).order_by(Personnel.full_name)
    if station_id:
        stmt = stmt.where(Personnel.station_id == station_id)
    if status:
        stmt = stmt.where(Personnel.status == status)
    return [PersonnelRead.model_validate(p) for p in (await db.execute(stmt)).scalars().all()]


@router.post("", response_model=PersonnelRead)
async def add_personnel(body: PersonnelCreate,
                        db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*LOGI))):
    person = Personnel(**body.model_dump())
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return PersonnelRead.model_validate(person)


@router.get("/{person_id}", response_model=PersonnelRead)
async def get_personnel(person_id: UUID,
                        db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_role(*ANY))):
    person = (await db.execute(select(Personnel).where(Personnel.id == person_id))).scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=404, detail="personnel not found")
    return PersonnelRead.model_validate(person)


@router.post("/{person_id}/location", response_model=PersonnelRead)
async def update_location(person_id: UUID, body: PersonnelLocationUpdate,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(require_role(*ANY))):
    person = (await db.execute(select(Personnel).where(Personnel.id == person_id))).scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=404, detail="personnel not found")
    person.last_location = body.last_location
    if body.status:
        person.status = body.status
    person.last_update = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(person)
    return PersonnelRead.model_validate(person)
