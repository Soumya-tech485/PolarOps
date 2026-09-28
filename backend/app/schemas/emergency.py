"""DTOs for the SOS workflow."""
import uuid

from pydantic import BaseModel


class SOSRequest(BaseModel):
    station_id: uuid.UUID
    payload: dict | None = None


class TransitionRequest(BaseModel):
    to_state: str


class EmergencyRead(BaseModel):
    id: uuid.UUID
    station_id: uuid.UUID
    raised_by: uuid.UUID | None
    raised_at: str | None = None
    state: str
    payload: dict | None


class EscalationReport(BaseModel):
    escalated: list[uuid.UUID]
    count: int