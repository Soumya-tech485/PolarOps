"""SOS escalation state machine mirroring the 48-hour no-contact pattern."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EmergencyEvent

ESCALATION_HOURS = 48

TRANSITIONS: dict[str, dict[str, set[str]]] = {
    "SOS_RAISED": {
        "STATION_RESPONSE": {"station", "logistics", "admin"},
        "ESCALATED_SAR": {"logistics", "admin"},
        "STOOD_DOWN": {"logistics", "admin"},
    },
    "STATION_RESPONSE": {
        "ESCALATED_SAR": {"logistics", "admin"},
        "RESOLVED": {"logistics", "admin"},
        "STOOD_DOWN": {"logistics", "admin"},
    },
    "ESCALATED_SAR": {"RESOLVED": {"admin"}},
    "RESOLVED": {},
    "STOOD_DOWN": {},
}


async def transition(db: AsyncSession, event_id, to_state: str, role: str) -> EmergencyEvent:
    event = await db.get(EmergencyEvent, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Emergency not found")
    allowed = TRANSITIONS.get(event.state, {}).get(to_state)
    if allowed is None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Illegal move {event.state} -> {to_state}")
    if role not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Role '{role}' cannot perform {to_state}")
    event.state = to_state
    await db.commit()
    return event


async def check_escalations(db: AsyncSession) -> list:
    """The 48-hour rule as code: silent incidents escalate themselves."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ESCALATION_HOURS)
    rows = (
        await db.execute(
            select(EmergencyEvent).where(
                EmergencyEvent.state.in_(("SOS_RAISED", "STATION_RESPONSE")),
                EmergencyEvent.raised_at < cutoff,
            )
        )
    ).scalars().all()
    for event in rows:
        event.state = "ESCALATED_SAR"
    if rows:
        await db.commit()
    return [e.id for e in rows]


async def scheduled_escalation_check() -> None:
    """APScheduler hourly entry point (own session)."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await check_escalations(db)