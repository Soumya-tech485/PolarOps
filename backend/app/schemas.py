from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


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
    weight_per_unit_kg: float = 0.0
    volume_per_unit_m3: float = 0.0
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


class IndentCreate(BaseModel):
    item_id: int
    quantity: float
    notes: Optional[str] = None


class WorkOrderCreate(BaseModel):
    asset_id: int
    description: str
    spare_parts: List[dict] = []  # [{"item_id": 1, "quantity": 5}, ...]


class WorkOrderComplete(BaseModel):
    spare_parts_used: List[dict] = []


class PersonnelCreate(BaseModel):
    station_id: Optional[int] = None
    name: str
    role: str
    medical_clearance_expiry: Optional[date] = None
    assigned_gear: List[str] = []
    emergency_contact: Optional[str] = None


class PackingItemRequest(BaseModel):
    item_id: int
    quantity: float


class PackingOptimizationRequest(BaseModel):
    items: List[PackingItemRequest]
    capacity_kg: float
    capacity_volume: float