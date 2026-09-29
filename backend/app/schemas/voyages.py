"""Voyage / station / crew DTOs."""
from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VoyageCreate(BaseModel):
    route: list[str]
    depart_date: date | None = None
    arrive_date: date | None = None
    capacity_kg: float | None = None
    capacity_m3: float | None = None


class VoyageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    route: list[str]
    depart_date: date | None
    arrive_date: date | None
    status: str
    capacity_kg: float | None
    capacity_m3: float | None
    delay_days: int


class StationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str
    name: str
    next_resupply_date: date | None


class CrewRead(BaseModel):
    personnel_id: UUID
    full_name: str
    role_on_board: str | None


class AssignRequest(BaseModel):
    personnel_id: UUID
    role_on_board: str | None = None


class VoyageDetail(BaseModel):
    voyage: VoyageRead
    cargo: list = []
    crew: list[CrewRead] = []
