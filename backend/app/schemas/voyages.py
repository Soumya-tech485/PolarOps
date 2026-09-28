"""DTOs for voyages, crew assignments, and stations (map + selectors)."""
import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.schemas.cargo import CargoRead


class StationRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    lat: float | None
    lon: float | None
    next_resupply_date: date | None

    model_config = {"from_attributes": True}


class VoyageCreate(BaseModel):
    route: list[str] = Field(min_length=2)
    depart_date: date | None = None
    arrive_date: date | None = None
    capacity_kg: float | None = Field(default=None, ge=0)
    capacity_m3: float | None = Field(default=None, ge=0)


class VoyageRead(BaseModel):
    id: uuid.UUID
    route: list[str]
    depart_date: date | None
    arrive_date: date | None
    status: str
    capacity_kg: float | None
    capacity_m3: float | None
    delay_days: int

    model_config = {"from_attributes": True}


class CrewRead(BaseModel):
    personnel_id: uuid.UUID
    full_name: str
    role_on_board: str | None


class VoyageDetail(BaseModel):
    voyage: VoyageRead
    cargo: list[CargoRead]
    crew: list[CrewRead]


class AssignRequest(BaseModel):
    personnel_id: uuid.UUID
    role_on_board: str | None = None