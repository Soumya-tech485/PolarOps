"""Personnel / asset / audit / consumption DTOs (+ legacy aliases)."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PersonnelCreate(BaseModel):
    full_name: str
    role_title: str | None = None
    station_id: UUID | None = None
    status: str = "active"


class PersonnelLocationUpdate(BaseModel):
    last_location: str
    status: str | None = None


LocationUpdate = PersonnelLocationUpdate


class PersonnelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    role_title: str | None
    station_id: UUID | None
    status: str
    last_location: str | None
    last_update: datetime | None
    clearance_expiry: date | None


class AssetCreate(BaseModel):
    serial: str
    name: str
    station_id: UUID | None = None
    status: str | None = None
    maintenance_due: bool = False
    next_maintenance: date | None = None


class MaintenanceUpdate(BaseModel):
    maintenance_due: bool
    next_maintenance: date | None = None


AssetMaintenance = MaintenanceUpdate


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    serial: str
    name: str
    station_id: UUID | None
    status: str | None
    maintenance_due: bool
    next_maintenance: date | None


class AuditRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ts: datetime
    user_id: UUID | None
    action: str
    entity: str
    entity_id: UUID | None
    details: dict | None
    prev_hash: str | None
    row_hash: str | None


AuditRead = AuditRow


class VerifyResponse(BaseModel):
    ok: bool
    broken_at_id: int | None
    rows_checked: int


VerifyReport = VerifyResponse


class ConsumptionCreate(BaseModel):
    cargo_item_id: UUID
    quantity: float = Field(gt=0)
    notes: str | None = None


class ConsumptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    cargo_item_id: UUID
    quantity: float
    consumed_by: UUID | None
    consumed_at: datetime
    notes: str | None