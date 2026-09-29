"""Emergency state machine + 48-hour auto-escalation."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models import EmergencyEvent

# state -> {target_state: roles allowed to perform it}
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
    "ESCALATED_SAR": {
        "RESOLVED": {"admin"},
    },
    "RESOLVED": {},
    "STOOD_DOWN": {},
}

ESCALATION_WINDOW = timedelta(hours=48)
ESCALATABLE_STATES = ("SOS_RAISED", "STATION_RESPONSE")


async def check_escalations(db: AsyncSession) -> list:
    """Silent incidents older than 48 h escalate themselves."""
    cutoff = datetime.now(timezone.utc) - ESCALATION_WINDOW
    result = await db.execute(
        select(EmergencyEvent).where(
            EmergencyEvent.state.in_(ESCALATABLE_STATES),
            EmergencyEvent.raised_at < cutoff,
        )
    )
    escalated = []
    for event in result.scalars().all():
        event.state = "ESCALATED_SAR"
        escalated.append(event.id)
    if escalated:
        await db.commit()
    return escalated


async def scheduled_escalation_check() -> None:
    """Hourly APScheduler entry point."""
    async with AsyncSessionLocal() as db:
        await check_escalations(db)