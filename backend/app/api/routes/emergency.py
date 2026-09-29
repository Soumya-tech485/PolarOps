"""Emergency SOS lifecycle + 48h escalation check."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import EmergencyEvent, User
from app.schemas.emergency import EmergencyRead, EmergencyTransition, SOSCreate
from app.services.emergency import TRANSITIONS, check_escalations

router = APIRouter()
ANY = ("station", "logistics", "admin")


def _read(e: EmergencyEvent) -> EmergencyRead:
    return EmergencyRead.model_validate(e)


@router.post("/sos", response_model=EmergencyRead)
async def raise_sos(body: SOSCreate,
                    db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_role(*ANY))):
    event = EmergencyEvent(station_id=body.station_id, raised_by=user.id,
                           state="SOS_RAISED", payload=body.payload)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _read(event)


@router.get("", response_model=list[EmergencyRead])
async def list_events(db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role(*ANY))):
    result = await db.execute(select(EmergencyEvent).order_by(EmergencyEvent.raised_at.desc()))
    return [_read(e) for e in result.scalars().all()]


@router.post("/run-escalation-check")
async def run_escalation_check(db: AsyncSession = Depends(get_db),
                               user: User = Depends(require_role("admin"))):
    escalated = await check_escalations(db)
    return {"count": len(escalated), "escalated": [str(e) for e in escalated]}


@router.get("/{event_id}", response_model=EmergencyRead)
async def get_event(event_id: UUID,
                    db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_role(*ANY))):
    event = (await db.execute(select(EmergencyEvent).where(EmergencyEvent.id == event_id))).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="emergency event not found")
    return _read(event)


@router.post("/{event_id}/transition", response_model=EmergencyRead)
async def transition_event(event_id: UUID, body: EmergencyTransition,
                           db: AsyncSession = Depends(get_db),
                           user: User = Depends(require_role(*ANY))):
    event = (await db.execute(select(EmergencyEvent).where(EmergencyEvent.id == event_id))).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="emergency event not found")
    allowed = TRANSITIONS.get(event.state, {})
    if body.to_state not in allowed:
        raise HTTPException(status_code=409,
                        detail=f"illegal transition from '{event.state}' to '{body.to_state}'")
    if user.role not in allowed[body.to_state]:
        raise HTTPException(status_code=403,
                        detail=f"role '{user.role}' cannot transition to '{body.to_state}'")
    event.state = body.to_state
    await db.commit()
    await db.refresh(event)
    return _read(event)
