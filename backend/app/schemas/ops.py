"""DTOs for personnel movement (PS#4), assets, and the audit read path."""
import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

PersonnelStatus = Literal["active", "in_transit", "emergency"]


class PersonnelCreate(BaseModel):
    full_name: str = Field(min_length=2)
    role_title: str | None = None
    station_id: uuid.UUID | None = None
    clearance_expiry: date | None = None


class PersonnelRead(BaseModel):
    id: uuid.UUID
    full_name: str
    role_title: str | None
    station_id: uuid.UUID | None
    status: str
    last_location: str | None
    last_update: str | None = None
    clearance_expiry: date | None

    model_config = {"from_attributes": True}


class LocationUpdate(BaseModel):
    last_location: str = Field(min_length=1)
    status: PersonnelStatus | None = None


class AssetCreate(BaseModel):
    serial: str = Field(min_length=1)
    name: str = Field(min_length=1)
    station_id: uuid.UUID | None = None
    status: str | None = None


class AssetRead(BaseModel):
    id: uuid.UUID
    serial: str
    name: str
    station_id: uuid.UUID | None
    status: str | None
    maintenance_due: bool
    next_maintenance: date | None

    model_config = {"from_attributes": True}


class MaintenanceUpdate(BaseModel):
    maintenance_due: bool
    next_maintenance: date | None = None


class AuditRead(BaseModel):
    id: int
    ts: str | None = None
    user_id: uuid.UUID | None
    action: str
    entity: str
    entity_id: uuid.UUID | None
    details: dict | None
    prev_hash: str | None
    row_hash: str | None


class VerifyReport(BaseModel):
    ok: bool
    broken_at_id: int | None
    rows_checked: int