"""Cargo + indent DTOs."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CargoCreate(BaseModel):
    name: str
    category: str | None = None
    weight_kg: float | None = None
    volume_m3: float | None = None
    priority: int = Field(3, ge=1, le=5)
    quantity: float = 0
    station_id: UUID | None = None
    asset_id: UUID | None = None
    box_label: str | None = None


class CargoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    category: str | None
    weight_kg: float | None
    volume_m3: float | None
    priority: int
    quantity: float
    station_id: UUID | None
    voyage_id: UUID | None
    asset_id: UUID | None
    box_label: str | None


class ManifestLine(BaseModel):
    indent_id: UUID
    item_name: str
    box_label: str | None
    qty: float
    stow_position: str | None
    status: str


class IndentCreate(BaseModel):
    cargo_item_id: UUID
    requested_qty: float = Field(gt=0)


class IndentClear(BaseModel):
    voyage_id: UUID


class IndentStow(BaseModel):
    stow_position: str


class IndentReceive(BaseModel):
    qr_token: str


class IndentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    cargo_item_id: UUID
    voyage_id: UUID | None
    requested_qty: float
    status: str
    qr_token: str | None
    stow_position: str | None
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime