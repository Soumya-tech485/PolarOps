"""Personnel movement (PS#4): roster per station, location log, status tracking."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Personnel, Station, User
from app.schemas.ops import LocationUpdate, PersonnelCreate, PersonnelRead

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")
LOGISTICS = require_role("logistics", "admin")


def _read(p: Personnel) -> PersonnelRead:
    out = PersonnelRead.model_validate(p)
    out.last_update = p.last_update.isoformat() if p.last_update else None
    return out


@router.get("", response_model=list[PersonnelRead])
async def roster(
    station_id: uuid.UUID | None = Query(None),
    person_status: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(ANY_ROLE),
):
    stmt = select(Personnel).order_by(Personnel.full_name)
    if station_id:
        stmt = stmt.where(Personnel.station_id == station_id)
    if person_status:
        stmt = stmt.where(Personnel.status == person_status)
    return [_read(p) for p in (await db.execute(stmt)).scalars().all()]


@router.post("", response_model=PersonnelRead, status_code=status.HTTP_201_CREATED)
async def add_person(body: PersonnelCreate, db: AsyncSession = Depends(get_db), user: User = Depends(LOGISTICS)):
    if body.station_id and await db.get(Station, body.station_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Station not found")
    person = Personnel(**body.model_dump(), status="active", last_update=datetime.now(timezone.utc))
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return _read(person)


@router.get("/{person_id}", response_model=PersonnelRead)
async def get_person(person_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    person = await db.get(Personnel, person_id)
    if person is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    return _read(person)


@router.post("/{person_id}/location", response_model=PersonnelRead)
async def log_location(person_id: uuid.UUID, body: LocationUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    person = await db.get(Personnel, person_id)
    if person is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    person.last_location = body.last_location
    if body.status:
        person.status = body.status
    person.last_update = datetime.now(timezone.utc)
    await db.commit()
    return _read(person)