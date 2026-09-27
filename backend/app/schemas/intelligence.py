"""DTOs for forecast, what-if and packing manifest responses."""
import uuid

from pydantic import BaseModel, Field


class ForecastLine(BaseModel):
    item_id: uuid.UUID
    name: str
    category: str | None
    quantity: float
    rate_per_day: float
    method: str
    days_remaining: int | None
    risk_tier: str
    recommended_action: str


class StationForecast(BaseModel):
    station_id: uuid.UUID
    eta_days: int | None
    lines: list[ForecastLine]


class AirDropLine(BaseModel):
    item_id: uuid.UUID
    name: str
    shortfall: float


class WhatIfReport(BaseModel):
    delay_days: int
    new_eta_days: int
    lines: list[ForecastLine]
    airdrop: list[AirDropLine]


class PackingRequest(BaseModel):
    voyage_id: uuid.UUID
    apply: bool = False


class ManifestItem(BaseModel):
    indent_id: uuid.UUID
    item_name: str
    qty: float
    weight_kg: float
    stow_position: str | None


class RejectedItem(BaseModel):
    indent_id: uuid.UUID
    item_name: str
    reason: str


class PackingManifest(BaseModel):
    voyage_id: uuid.UUID
    selected: list[ManifestItem]
    rejected: list[RejectedItem]
    used_kg: float
    used_m3: float
    capacity_kg: float | None
    capacity_m3: float | None
    solver_status: str
    solve_seconds: float = Field(ge=0)