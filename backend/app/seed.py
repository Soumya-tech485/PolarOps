from datetime import date, datetime, timedelta
import random
import hashlib
from sqlalchemy.orm import Session
from . import models
from .auth import hash_password


def seed_db(db: Session):
    user_count = db.query(models.User).count()
    if user_count > 0:
        return

    random.seed(42)
    today = date.today()

    # Stations
    stations = [
        models.Station(name="Bharati Station", code="BHARATI", latitude=-69.41, longitude=76.37,
                       next_resupply_date=today + timedelta(days=45), status="active"),
        models.Station(name="Maitri Station", code="MAITRI", latitude=-70.76, longitude=11.73,
                       next_resupply_date=today + timedelta(days=60), status="active"),
        models.Station(name="Himadri Station", code="HIMADRI", latitude=78.92, longitude=11.93,
                       next_resupply_date=today + timedelta(days=90), status="seasonal")
    ]
    for station in stations:
        db.add(station)
    db.flush()

    bharati = stations[0]

    # Users (3 roles)
    users = [
        {"email": "admin@polarops.demo", "name": "Expedition Planner", "password": "admin123", "role": "admin"},
        {"email": "logistics@polarops.demo", "name": "Logistics Officer", "password": "logistics123", "role": "logistics_officer"},
        {"email": "station@polarops.demo", "name": "Station Manager", "password": "station123", "role": "station_manager"}
    ]
    for user in users:
        db.add(models.User(email=user["email"], name=user["name"],
                           password_hash=hash_password(user["password"]), role=user["role"]))

    # Items for Bharati
    items_data = [
        {"name": "Diesel", "category": "Fuel", "unit": "liters", "current_stock": 12000, "safety_stock": 3000,
         "criticality": "critical", "default_daily_consumption": 300, "weight_per_unit_kg": 0.85, "volume_per_unit_m3": 0.001},
        {"name": "Food Rations", "category": "Food", "unit": "meals", "current_stock": 1800, "safety_stock": 500,
         "criticality": "high", "default_daily_consumption": 50, "weight_per_unit_kg": 0.8, "volume_per_unit_m3": 0.002},
        {"name": "Medical Kits", "category": "Medical", "unit": "kits", "current_stock": 80, "safety_stock": 25,
         "criticality": "critical", "default_daily_consumption": 1, "weight_per_unit_kg": 5, "volume_per_unit_m3": 0.01},
        {"name": "Generator Spares", "category": "Maintenance", "unit": "units", "current_stock": 40, "safety_stock": 15,
         "criticality": "high", "default_daily_consumption": 0.4, "weight_per_unit_kg": 12, "volume_per_unit_m3": 0.05},
        {"name": "Radio Batteries", "category": "Communications", "unit": "units", "current_stock": 120, "safety_stock": 30,
         "criticality": "high", "default_daily_consumption": 2, "weight_per_unit_kg": 1.5, "volume_per_unit_m3": 0.005},
        {"name": "Water Filters", "category": "Life Support", "unit": "units", "current_stock": 60, "safety_stock": 20,
         "criticality": "high", "default_daily_consumption": 1, "weight_per_unit_kg": 2, "volume_per_unit_m3": 0.008},
        {"name": "Oxygen Cylinders", "category": "Medical", "unit": "cylinders", "current_stock": 30, "safety_stock": 10,
         "criticality": "critical", "default_daily_consumption": 0.2, "weight_per_unit_kg": 15, "volume_per_unit_m3": 0.02},
        {"name": "Cold Weather Gloves", "category": "Safety", "unit": "pairs", "current_stock": 150, "safety_stock": 40,
         "criticality": "medium", "default_daily_consumption": 1, "weight_per_unit_kg": 0.3, "volume_per_unit_m3": 0.001},
        {"name": "Scientific Sensor Kits", "category": "Research", "unit": "kits", "current_stock": 18, "safety_stock": 5,
         "criticality": "medium", "default_daily_consumption": 0.1, "weight_per_unit_kg": 8, "volume_per_unit_m3": 0.03},
        {"name": "Satellite Modem Spares", "category": "Communications", "unit": "units", "current_stock": 6, "safety_stock": 2,
         "criticality": "high", "default_daily_consumption": 0.05, "weight_per_unit_kg": 3, "volume_per_unit_m3": 0.005}
    ]

    item_objects = {}
    for item_data in items_data:
        item = models.Item(station_id=bharati.id, **item_data)
        db.add(item)
        item_objects[item_data["name"]] = item

    db.flush()

    # Consumption history
    for item_data in items_data:
        item = item_objects[item_data["name"]]
        base = item_data["default_daily_consumption"]
        if base <= 0:
            continue
        for days_ago in range(30, 0, -1):
            quantity = max(0, round(base * random.uniform(0.7, 1.3), 1))
            if quantity == 0:
                continue
            db.add(models.ConsumptionLog(
                station_id=bharati.id, item_id=item.id, quantity=quantity,
                logged_at=datetime.utcnow() - timedelta(days=days_ago),
                logged_by="seed", notes="Synthetic historical consumption"
            ))

    # Assets
    assets_data = [
        {"name": "Generator G-01", "category": "Power", "status": "operational", "location": "Power House",
         "serial_number": "GEN-001", "last_maintenance_date": today - timedelta(days=20),
         "next_maintenance_date": today + timedelta(days=10), "assigned_to": "Engineering Team"},
        {"name": "Generator G-02", "category": "Power", "status": "maintenance_due", "location": "Power House",
         "serial_number": "GEN-002", "last_maintenance_date": today - timedelta(days=60),
         "next_maintenance_date": today - timedelta(days=3), "assigned_to": "Engineering Team"},
        {"name": "Snow Vehicle SV-01", "category": "Transport", "status": "operational", "location": "Vehicle Bay",
         "serial_number": "SV-001", "last_maintenance_date": today - timedelta(days=10),
         "next_maintenance_date": today + timedelta(days=25), "assigned_to": "Field Operations"},
        {"name": "Satellite Terminal SAT-01", "category": "Communications", "status": "degraded", "location": "Comms Room",
         "serial_number": "SAT-001", "last_maintenance_date": today - timedelta(days=15),
         "next_maintenance_date": today + timedelta(days=5), "assigned_to": "IT Team"},
        {"name": "Weather Station WS-01", "category": "Research", "status": "operational", "location": "Observation Deck",
         "serial_number": "WS-001", "last_maintenance_date": today - timedelta(days=5),
         "next_maintenance_date": today + timedelta(days=30), "assigned_to": "Science Team"},
        {"name": "Lab Freezer LF-01", "category": "Research", "status": "operational", "location": "Laboratory",
         "serial_number": "LF-001", "last_maintenance_date": today - timedelta(days=12),
         "next_maintenance_date": today + timedelta(days=18), "assigned_to": "Science Team"},
        {"name": "Fuel Bladder FB-01", "category": "Fuel Storage", "status": "degraded", "location": "Fuel Depot",
         "serial_number": "FB-001", "last_maintenance_date": today - timedelta(days=40),
         "next_maintenance_date": today + timedelta(days=2), "assigned_to": "Engineering Team"},
        {"name": "Radio Set R-02", "category": "Communications", "status": "operational", "location": "Operations Room",
         "serial_number": "R-002", "last_maintenance_date": today - timedelta(days=8),
         "next_maintenance_date": today + timedelta(days=22), "assigned_to": "Operations Team"}
    ]

    asset_objects = {}
    for asset_data in assets_data:
        asset = models.Asset(station_id=bharati.id, **asset_data)
        db.add(asset)
        asset_objects[asset_data["name"]] = asset

    # Shipment
    shipment = models.Shipment(
        station_id=bharati.id, mode="Ship", origin="Cape Town", status="planned",
        scheduled_departure=today + timedelta(days=20), expected_arrival=today + timedelta(days=45),
        capacity_kg=200000, capacity_volume=800, delay_days=0
    )
    db.add(shipment)
    db.flush()

    # Personnel (25 people)
    personnel_roles = ["commander", "scientist", "engineer", "medic", "support"]
    first_names = ["Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anita", "Rahul", "Kavita", "Sanjay", "Meera",
                   "Arjun", "Pooja", "Karan", "Divya", "Nikhil", "Riya", "Aditya", "Neha", "Rohan", "Shweta",
                   "Manish", "Pallavi", "Deepak", "Sonal", "Gaurav"]
    for i, name in enumerate(first_names):
        db.add(models.Personnel(
            station_id=bharati.id,
            name=name,
            role=personnel_roles[i % len(personnel_roles)],
            medical_clearance_expiry=today + timedelta(days=random.randint(30, 180)),
            assigned_gear=["cold_weather_suit", "radio", "survival_kit"],
            status="on_station",
            emergency_contact=f"+91-{random.randint(9000000000, 9999999999)}"
        ))

    # Sample indent (requested, not yet cleared)
    diesel = item_objects["Diesel"]
    qr_token = hashlib.md5(f"indent-1-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16]
    db.add(models.Indent(
        station_id=bharati.id, item_id=diesel.id, quantity=500,
        requested_by="station@polarops.demo", requested_at=datetime.utcnow() - timedelta(hours=2),
        status="requested", qr_token=qr_token,
        notes="Routine fuel request for generator operations"
    ))

    # Sample work order (open)
    gen_g02 = asset_objects["Generator G-02"]
    db.add(models.WorkOrder(
        asset_id=gen_g02.id, station_id=bharati.id,
        description="Routine maintenance - oil change and filter replacement",
        status="open", created_by="station@polarops.demo"
    ))

    # Alerts
    alerts_data = [
        {"severity": "high", "title": "Generator maintenance overdue",
         "message": "Generator G-02 maintenance is overdue by 3 days.", "entity_type": "asset"},
        {"severity": "medium", "title": "Satellite terminal degraded",
         "message": "Satellite Terminal SAT-01 is operating in degraded mode.", "entity_type": "asset"},
        {"severity": "medium", "title": "Pending cargo indent",
         "message": "Station Manager requested 500L diesel. Awaiting clearance.", "entity_type": "indent"},
        {"severity": "low", "title": "Resupply planning reminder",
         "message": "Next resupply is scheduled in 45 days. Review critical cargo.", "entity_type": "shipment"}
    ]
    for alert_data in alerts_data:
        db.add(models.Alert(station_id=bharati.id, **alert_data))

    db.commit()