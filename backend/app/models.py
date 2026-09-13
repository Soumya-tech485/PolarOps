from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    role = Column(String)  # admin, logistics_officer, station_manager


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    code = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    next_resupply_date = Column(Date)
    status = Column(String, default="active")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    name = Column(String)
    category = Column(String)
    unit = Column(String)
    current_stock = Column(Float, default=0)
    safety_stock = Column(Float, default=0)
    criticality = Column(String, default="medium")
    default_daily_consumption = Column(Float, default=0)
    weight_per_unit_kg = Column(Float, default=0)
    volume_per_unit_m3 = Column(Float, default=0)
    expiry_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Float)
    logged_at = Column(DateTime, default=datetime.utcnow)
    logged_by = Column(String)
    notes = Column(String, nullable=True)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    name = Column(String)
    category = Column(String)
    status = Column(String, default="operational")
    location = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    last_maintenance_date = Column(Date, nullable=True)
    next_maintenance_date = Column(Date, nullable=True)
    assigned_to = Column(String, nullable=True)
    notes = Column(String, nullable=True)


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    mode = Column(String)
    origin = Column(String)
    status = Column(String, default="planned")
    scheduled_departure = Column(Date)
    expected_arrival = Column(Date)
    capacity_kg = Column(Float, default=0)
    capacity_volume = Column(Float, default=0)
    delay_days = Column(Integer, default=0)


class ShipmentItem(Base):
    __tablename__ = "shipment_items"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    planned_quantity = Column(Float)
    weight_kg = Column(Float, default=0)
    volume_m3 = Column(Float, default=0)
    stow_position = Column(Integer, default=0)


class Indent(Base):
    __tablename__ = "indents"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Float)
    requested_by = Column(String)
    requested_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="requested")  # requested, cleared, rejected, loaded, received
    cleared_by = Column(String, nullable=True)
    cleared_at = Column(DateTime, nullable=True)
    qr_token = Column(String, unique=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True)
    stow_position = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    station_id = Column(Integer, ForeignKey("stations.id"))
    description = Column(String)
    status = Column(String, default="open")  # open, in_progress, completed
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String, nullable=True)
    spare_parts_used = Column(JSON, default=list)  # [{"item_id": 1, "quantity": 5}, ...]


class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    name = Column(String)
    role = Column(String)  # commander, scientist, engineer, medic, support
    medical_clearance_expiry = Column(Date, nullable=True)
    assigned_gear = Column(JSON, default=list)  # ["cold_weather_suit", "radio", ...]
    status = Column(String, default="on_station")  # on_station, in_transit, on_leave
    emergency_contact = Column(String, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"))
    severity = Column(String)
    title = Column(String)
    message = Column(String)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String)
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(Integer)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)