from pydantic import BaseModel
from typing import Optional
from datetime import date


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    email: str
    role: str


class ConsumptionCreate(BaseModel):
    item_id: int
    quantity: float
    notes: Optional[str] = None


class ItemCreate(BaseModel):
    station_id: Optional[int] = None
    name: str
    category: str
    unit: str
    current_stock: float
    safety_stock: float
    criticality: str = "medium"
    default_daily_consumption: float = 0.0
    expiry_date: Optional[date] = None


class AssetCreate(BaseModel):
    station_id: Optional[int] = None
    name: str
    category: str
    status: str = "operational"
    location: Optional[str] = None
    serial_number: Optional[str] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None