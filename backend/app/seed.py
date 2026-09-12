from datetime import date, datetime, timedelta
import random
from sqlalchemy.orm import Session
from . import models
from .auth import hash_password


def seed_db(db: Session):
    user_count = db.query(models.User).count()
    if user_count > 0:
        return

    random.seed(42)

    today = date.today()

    station = models.Station(
        name="Bharati Station",
        code="BHARATI",
        latitude=-69.41,
        longitude=76.37,
        next_resupply_date=today + timedelta(days=45),
        status="active"
    )

    db.add(station)
    db.flush()

    users = [
        {
            "email": "admin@polarops.demo",
            "name": "Expedition Planner",
            "password": "admin123",
            "role": "admin"
        },
        {
            "email": "station@polarops.demo",
            "name": "Station Manager",
            "password": "station123",
            "role": "station_manager"
        },
        {
            "email": "logistics@polarops.demo",
            "name": "Logistics Officer",
            "password": "logistics123",
            "role": "logistics_officer"
        }
    ]

    for user in users:
        db.add(models.User(
            email=user["email"],
            name=user["name"],
            password_hash=hash_password(user["password"]),
            role=user["role"]
        ))

    items_data = [
        {
            "name": "Diesel",
            "category": "Fuel",
            "unit": "liters",
            "current_stock": 12000,
            "safety_stock": 3000,
            "criticality": "critical",
            "default_daily_consumption": 300
        },
        {
            "name": "Food Rations",
            "category": "Food",
            "unit": "meals",
            "current_stock": 1800,
            "safety_stock": 500,
            "criticality": "high",
            "default_daily_consumption": 50
        },
        {
            "name": "Medical Kits",
            "category": "Medical",
            "unit": "kits",
            "current_stock": 80,
            "safety_stock": 25,
            "criticality": "critical",
            "default_daily_consumption": 1
        },
        {
            "name": "Generator Spares",
            "category": "Maintenance",
            "unit": "units",
            "current_stock": 40,
            "safety_stock": 15,
            "criticality": "high",
            "default_daily_consumption": 0.4
        },
        {
            "name": "Radio Batteries",
            "category": "Communications",
            "unit": "units",
            "current_stock": 120,
            "safety_stock": 30,
            "criticality": "high",
            "default_daily_consumption": 2
        },
        {
            "name": "Water Filters",
            "category": "Life Support",
            "unit": "units",
            "current_stock": 60,
            "safety_stock": 20,
            "criticality": "high",
            "default_daily_consumption": 1
        },
        {
            "name": "Oxygen Cylinders",
            "category": "Medical",
            "unit": "cylinders",
            "current_stock": 30,
            "safety_stock": 10,
            "criticality": "critical",
            "default_daily_consumption": 0.2
        },
        {
            "name": "Cold Weather Gloves",
            "category": "Safety",
            "unit": "pairs",
            "current_stock": 150,
            "safety_stock": 40,
            "criticality": "medium",
            "default_daily_consumption": 1
        },
        {
            "name": "Scientific Sensor Kits",
            "category": "Research",
            "unit": "kits",
            "current_stock": 18,
            "safety_stock": 5,
            "criticality": "medium",
            "default_daily_consumption": 0.1
        },
        {
            "name": "Satellite Modem Spares",
            "category": "Communications",
            "unit": "units",
            "current_stock": 6,
            "safety_stock": 2,
            "criticality": "high",
            "default_daily_consumption": 0.05
        }
    ]

    item_objects = {}

    for item_data in items_data:
        item = models.Item(
            station_id=station.id,
            name=item_data["name"],
            category=item_data["category"],
            unit=item_data["unit"],
            current_stock=item_data["current_stock"],
            safety_stock=item_data["safety_stock"],
            criticality=item_data["criticality"],
            default_daily_consumption=item_data["default_daily_consumption"]
        )
        db.add(item)
        item_objects[item_data["name"]] = item

    db.flush()

    for item_data in items_data:
        item = item_objects[item_data["name"]]
        base_consumption = item_data["default_daily_consumption"]

        if base_consumption <= 0:
            continue

        for days_ago in range(30, 0, -1):
            quantity = max(0, round(base_consumption * random.uniform(0.7, 1.3), 1))

            if quantity == 0:
                continue

            log = models.ConsumptionLog(
                station_id=station.id,
                item_id=item.id,
                quantity=quantity,
                logged_at=datetime.utcnow() - timedelta(days=days_ago),
                logged_by="seed",
                notes="Synthetic historical consumption"
            )
            db.add(log)

    assets_data = [
        {
            "name": "Generator G-01",
            "category": "Power",
            "status": "operational",
            "location": "Power House",
            "serial_number": "GEN-001",
            "last_maintenance_date": today - timedelta(days=20),
            "next_maintenance_date": today + timedelta(days=10),
            "assigned_to": "Engineering Team",
            "notes": "Primary generator"
        },
        {
            "name": "Generator G-02",
            "category": "Power",
            "status": "maintenance_due",
            "location": "Power House",
            "serial_number": "GEN-002",
            "last_maintenance_date": today - timedelta(days=60),
            "next_maintenance_date": today - timedelta(days=3),
            "assigned_to": "Engineering Team",
            "notes": "Maintenance overdue"
        },
        {
            "name": "Snow Vehicle SV-01",
            "category": "Transport",
            "status": "operational",
            "location": "Vehicle Bay",
            "serial_number": "SV-001",
            "last_maintenance_date": today - timedelta(days=10),
            "next_maintenance_date": today + timedelta(days=25),
            "assigned_to": "Field Operations",
            "notes": "Used for cargo movement"
        },
        {
            "name": "Satellite Terminal SAT-01",
            "category": "Communications",
            "status": "degraded",
            "location": "Comms Room",
            "serial_number": "SAT-001",
            "last_maintenance_date": today - timedelta(days=15),
            "next_maintenance_date": today + timedelta(days=5),
            "assigned_to": "IT Team",
            "notes": "Intermittent signal"
        },
        {
            "name": "Weather Station WS-01",
            "category": "Research",
            "status": "operational",
            "location": "Observation Deck",
            "serial_number": "WS-001",
            "last_maintenance_date": today - timedelta(days=5),
            "next_maintenance_date": today + timedelta(days=30),
            "assigned_to": "Science Team",
            "notes": "Working normally"
        },
        {
            "name": "Lab Freezer LF-01",
            "category": "Research",
            "status": "operational",
            "location": "Laboratory",
            "serial_number": "LF-001",
            "last_maintenance_date": today - timedelta(days=12),
            "next_maintenance_date": today + timedelta(days=18),
            "assigned_to": "Science Team",
            "notes": "Stores samples"
        },
        {
            "name": "Fuel Bladder FB-01",
            "category": "Fuel Storage",
            "status": "degraded",
            "location": "Fuel Depot",
            "serial_number": "FB-001",
            "last_maintenance_date": today - timedelta(days=40),
            "next_maintenance_date": today + timedelta(days=2),
            "assigned_to": "Engineering Team",
            "notes": "Minor wear detected"
        },
        {
            "name": "Radio Set R-02",
            "category": "Communications",
            "status": "operational",
            "location": "Operations Room",
            "serial_number": "R-002",
            "last_maintenance_date": today - timedelta(days=8),
            "next_maintenance_date": today + timedelta(days=22),
            "assigned_to": "Operations Team",
            "notes": "Backup radio"
        }
    ]

    for asset_data in assets_data:
        asset = models.Asset(
            station_id=station.id,
            name=asset_data["name"],
            category=asset_data["category"],
            status=asset_data["status"],
            location=asset_data["location"],
            serial_number=asset_data["serial_number"],
            last_maintenance_date=asset_data["last_maintenance_date"],
            next_maintenance_date=asset_data["next_maintenance_date"],
            assigned_to=asset_data["assigned_to"],
            notes=asset_data["notes"]
        )
        db.add(asset)

    shipment = models.Shipment(
        station_id=station.id,
        mode="Ship",
        origin="Cape Town",
        status="planned",
        scheduled_departure=today + timedelta(days=20),
        expected_arrival=today + timedelta(days=45),
        capacity_kg=200000,
        capacity_volume=800,
        delay_days=0
    )

    db.add(shipment)
    db.flush()

    shipment_items_data = [
        {
            "item_name": "Diesel",
            "planned_quantity": 5000,
            "weight_kg": 4250,
            "volume_m3": 5
        },
        {
            "item_name": "Food Rations",
            "planned_quantity": 1000,
            "weight_kg": 800,
            "volume_m3": 4
        },
        {
            "item_name": "Medical Kits",
            "planned_quantity": 30,
            "weight_kg": 120,
            "volume_m3": 1
        },
        {
            "item_name": "Generator Spares",
            "planned_quantity": 20,
            "weight_kg": 350,
            "volume_m3": 2
        },
        {
            "item_name": "Radio Batteries",
            "planned_quantity": 60,
            "weight_kg": 90,
            "volume_m3": 0.5
        }
    ]

    for shipment_item_data in shipment_items_data:
        item = item_objects.get(shipment_item_data["item_name"])
        if not item:
            continue

        shipment_item = models.ShipmentItem(
            shipment_id=shipment.id,
            item_id=item.id,
            planned_quantity=shipment_item_data["planned_quantity"],
            weight_kg=shipment_item_data["weight_kg"],
            volume_m3=shipment_item_data["volume_m3"]
        )
        db.add(shipment_item)

    alerts_data = [
        {
            "severity": "high",
            "title": "Generator maintenance overdue",
            "message": "Generator G-02 maintenance is overdue by 3 days.",
            "entity_type": "asset",
            "entity_id": None
        },
        {
            "severity": "medium",
            "title": "Satellite terminal degraded",
            "message": "Satellite Terminal SAT-01 is operating in degraded mode.",
            "entity_type": "asset",
            "entity_id": None
        },
        {
            "severity": "medium",
            "title": "Resupply planning reminder",
            "message": "Next resupply is scheduled in 45 days. Review critical cargo.",
            "entity_type": "shipment",
            "entity_id": shipment.id
        }
    ]

    for alert_data in alerts_data:
        alert = models.Alert(
            station_id=station.id,
            severity=alert_data["severity"],
            title=alert_data["title"],
            message=alert_data["message"],
            entity_type=alert_data["entity_type"],
            entity_id=alert_data["entity_id"]
        )
        db.add(alert)

    db.commit()