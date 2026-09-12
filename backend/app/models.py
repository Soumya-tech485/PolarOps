from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    role = Column(String)


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