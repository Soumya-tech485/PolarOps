"""Emergency DTOs."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SOSCreate(BaseModel):
    station_id: UUID
    payload: dict | None = None


class EmergencyTransition(BaseModel):
    to_state: str


class EmergencyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    station_id: UUID
    raised_by: UUID | None
    raised_at: datetime
    state: str
    payload: dict | None