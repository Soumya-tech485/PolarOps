"""Forecast / what-if / packing DTOs."""
from uuid import UUID

from pydantic import BaseModel


class ForecastLine(BaseModel):
    item_id: UUID
    name: str
    category: str | None
    quantity: float
    rate_per_day: float
    method: str
    days_remaining: int | None
    risk_tier: str
    recommended_action: str


class StationForecast(BaseModel):
    station_id: UUID
    eta_days: int
    lines: list[ForecastLine]


class WhatIfReport(BaseModel):
    delay_days: int
    new_eta_days: int
    lines: list[ForecastLine]
    airdrop: list[dict]


class PackingRequest(BaseModel):
    voyage_id: UUID
    apply: bool = False


class PackingManifest(BaseModel):
    indent_id: UUID
    item_name: str
    box_label: str | None
    qty: float
    stow_position: str | None


class PackingResponse(BaseModel):
    voyage_id: UUID
    selected: list[dict]
    rejected: list[dict]
    used_kg: float
    used_m3: float
    capacity_kg: float
    capacity_m3: float
    solver_status: str
    solve_seconds: float
    applied: bool = False

