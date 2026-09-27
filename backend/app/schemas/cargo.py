"""DTOs for cargo, indents, consumption — the JSON contract for PS#2/PS#3."""
import uuid

from pydantic import BaseModel, Field


class CargoCreate(BaseModel):
    name: str = Field(min_length=1)
    category: str | None = None
    weight_kg: float | None = Field(default=None, ge=0)
    volume_m3: float | None = Field(default=None, ge=0)
    priority: int = Field(default=3, ge=1, le=5)
    quantity: float = Field(default=0, ge=0)
    station_id: uuid.UUID | None = None
    voyage_id: uuid.UUID | None = None
    box_label: str | None = None


class CargoRead(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None
    weight_kg: float | None
    volume_m3: float | None
    priority: int
    quantity: float
    station_id: uuid.UUID | None
    voyage_id: uuid.UUID | None
    box_label: str | None

    model_config = {"from_attributes": True}


class IndentCreate(BaseModel):
    cargo_item_id: uuid.UUID
    requested_qty: float = Field(gt=0)


class IndentClear(BaseModel):
    voyage_id: uuid.UUID


class IndentStow(BaseModel):
    stow_position: str = Field(min_length=1)


class IndentReceive(BaseModel):
    qr_token: str


class IndentRead(BaseModel):
    id: uuid.UUID
    cargo_item_id: uuid.UUID
    voyage_id: uuid.UUID | None
    requested_qty: float
    status: str
    qr_token: str | None
    stow_position: str | None
    created_at: str | None = None

    model_config = {"from_attributes": True}


class ManifestLine(BaseModel):
    indent_id: uuid.UUID
    item_name: str
    box_label: str | None
    qty: float
    stow_position: str | None
    status: str


class ConsumptionCreate(BaseModel):
    cargo_item_id: uuid.UUID
    quantity: float = Field(gt=0)
    notes: str | None = None


class ConsumptionRead(BaseModel):
    id: uuid.UUID
    cargo_item_id: uuid.UUID
    quantity: float
    consumed_at: str | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}