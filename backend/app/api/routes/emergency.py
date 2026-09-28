"""Emergency response endpoints (PS#5)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import EmergencyEvent, Station, User
from app.schemas.emergency import EmergencyRead, EscalationReport, SOSRequest, TransitionRequest
from app.services import emergency

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")


def _read(e: EmergencyEvent) -> EmergencyRead:
    out = EmergencyRead.model_validate(e)
    out.raised_at = e.raised_at.isoformat() if e.raised_at else None
    return out


@router.post("/sos", response_model=EmergencyRead, status_code=status.HTTP_201_CREATED)
async def raise_sos(body: SOSRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_role("station", "logistics"))):
    if await db.get(Station, body.station_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Station not found")
    event = EmergencyEvent(station_id=body.station_id, raised_by=user.id, payload=body.payload)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _read(event)


@router.get("", response_model=list[EmergencyRead])
async def list_emergencies(db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    return [_read(e) for e in (await db.execute(
        select(EmergencyEvent).order_by(EmergencyEvent.raised_at.desc()))).scalars().all()]


@router.post("/run-escalation-check", response_model=EscalationReport)
async def run_check(db: AsyncSession = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Demo/test button for the 48-hour rule (production: APScheduler hourly)."""
    ids = await emergency.check_escalations(db)
    return EscalationReport(escalated=ids, count=len(ids))


@router.get("/{event_id}", response_model=EmergencyRead)
async def get_emergency(event_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    event = await db.get(EmergencyEvent, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Emergency not found")
    return _read(event)


@router.post("/{event_id}/transition", response_model=EmergencyRead)
async def move_state(event_id: uuid.UUID, body: TransitionRequest, db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    return _read(await emergency.transition(db, event_id, body.to_state, user.role))