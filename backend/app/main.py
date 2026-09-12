from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional
from jose import JWTError

from .database import SessionLocal, engine, Base, get_db
from . import models, schemas
from .auth import verify_password, create_access_token, decode_token
from .seed import seed_db
from .forecast import forecast_item, what_if_report

app = FastAPI(title="PolarOps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if credentials is None:
        return None

    try:
        email = decode_token(credentials.credentials)
    except JWTError:
        return None

    user = db.query(models.User).filter(models.User.email == email).first()
    return user


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_db(db)
    db.close()


@app.get("/")
def root():
    return {
        "message": "PolarOps API is running"
    }


@app.post("/reset")
def reset_demo_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    seed_db(db)
    db.close()

    return {
        "message": "Demo data reset successfully"
    }


@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.email)

    return schemas.TokenResponse(
        access_token=token,
        name=user.name,
        email=user.email,
        role=user.role
    )


@app.get("/auth/me")
def me(current_user: Optional[models.User] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


@app.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    shipment = db.query(models.Shipment).filter(
        models.Shipment.station_id == station.id
    ).first()

    delay_days = shipment.delay_days if shipment else 0

    items = db.query(models.Item).filter(
        models.Item.station_id == station.id
    ).all()

    forecasts = [
        forecast_item(db, item, station, delay_days)
        for item in items
    ]

    critical_items = len([
        f for f in forecasts
        if f["risk"] in ["critical", "high"]
    ])

    low_stock_items = len([
        f for f in forecasts
        if f["current_stock"] <= f["safety_stock"]
    ])

    assets = db.query(models.Asset).filter(
        models.Asset.station_id == station.id
    ).all()

    operational_assets = len([
        asset for asset in assets
        if asset.status.lower() == "operational"
    ])

    maintenance_due_assets = len([
        asset for asset in assets
        if asset.status.lower() == "maintenance_due"
    ])

    failed_assets = len([
        asset for asset in assets
        if asset.status.lower() == "failed"
    ])

    alerts = db.query(models.Alert).filter(
        models.Alert.station_id == station.id
    ).all()

    unread_alerts = len([alert for alert in alerts if not alert.is_read])
    high_alerts = len([alert for alert in alerts if alert.severity == "high"])

    overall_risk = "low"

    if any(f["risk"] == "critical" for f in forecasts):
        overall_risk = "critical"
    elif any(f["risk"] == "high" for f in forecasts):
        overall_risk = "high"
    elif any(f["risk"] == "medium" for f in forecasts):
        overall_risk = "medium"

    return {
        "station": {
            "id": station.id,
            "name": station.name,
            "code": station.code,
            "next_resupply_date": station.next_resupply_date.isoformat() if station.next_resupply_date else None
        },
        "overall_risk": overall_risk,
        "inventory": {
            "total_items": len(items),
            "critical_items": critical_items,
            "low_stock_items": low_stock_items
        },
        "assets": {
            "total_assets": len(assets),
            "operational": operational_assets,
            "maintenance_due": maintenance_due_assets,
            "failed": failed_assets
        },
        "shipment": {
            "id": shipment.id,
            "mode": shipment.mode,
            "origin": shipment.origin,
            "status": shipment.status,
            "expected_arrival": shipment.expected_arrival.isoformat() if shipment.expected_arrival else None,
            "delay_days": shipment.delay_days
        } if shipment else None,
        "alerts": {
            "unread": unread_alerts,
            "high_severity": high_alerts
        }
    }


@app.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    shipment = db.query(models.Shipment).filter(
        models.Shipment.station_id == station.id
    ).first()

    delay_days = shipment.delay_days if shipment else 0

    items = db.query(models.Item).filter(
        models.Item.station_id == station.id
    ).all()

    return [
        forecast_item(db, item, station, delay_days)
        for item in items
    ]


@app.post("/inventory")
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    item = models.Item(
        station_id=payload.station_id or station.id,
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        current_stock=payload.current_stock,
        safety_stock=payload.safety_stock,
        criticality=payload.criticality,
        default_daily_consumption=payload.default_daily_consumption,
        expiry_date=payload.expiry_date
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return forecast_item(db, item, station, 0)


@app.get("/consumption")
def get_consumption(item_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.ConsumptionLog)

    if item_id:
        query = query.filter(models.ConsumptionLog.item_id == item_id)

    logs = query.order_by(models.ConsumptionLog.logged_at.desc()).limit(100).all()

    result = []

    for log in logs:
        item = db.query(models.Item).filter(models.Item.id == log.item_id).first()

        result.append({
            "id": log.id,
            "item_id": log.item_id,
            "item_name": item.name if item else "Unknown",
            "quantity": log.quantity,
            "logged_at": log.logged_at.isoformat(),
            "logged_by": log.logged_by,
            "notes": log.notes
        })

    return result


@app.post("/consumption")
def create_consumption(
    payload: schemas.ConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user)
):
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

    item = db.query(models.Item).filter(models.Item.id == payload.item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if payload.quantity > item.current_stock:
        raise HTTPException(
            status_code=400,
            detail="Cannot consume more than current stock"
        )

    item.current_stock = item.current_stock - payload.quantity

    log = models.ConsumptionLog(
        station_id=item.station_id,
        item_id=item.id,
        quantity=payload.quantity,
        logged_by=current_user.email if current_user else "demo-user",
        notes=payload.notes
    )

    db.add(log)

    if item.current_stock <= item.safety_stock:
        alert = models.Alert(
            station_id=item.station_id,
            severity="high",
            title=f"{item.name} below safety stock",
            message=f"{item.name} current stock is {item.current_stock} {item.unit}, below safety stock {item.safety_stock} {item.unit}.",
            entity_type="item",
            entity_id=item.id
        )
        db.add(alert)

    db.commit()

    return {
        "message": "Consumption logged successfully",
        "item_id": item.id,
        "item_name": item.name,
        "current_stock": item.current_stock
    }


@app.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(models.Asset).all()

    today = date.today()

    result = []

    for asset in assets:
        maintenance_overdue = False

        if asset.next_maintenance_date:
            maintenance_overdue = asset.next_maintenance_date < today

        result.append({
            "id": asset.id,
            "station_id": asset.station_id,
            "name": asset.name,
            "category": asset.category,
            "status": asset.status,
            "location": asset.location,
            "serial_number": asset.serial_number,
            "last_maintenance_date": asset.last_maintenance_date.isoformat() if asset.last_maintenance_date else None,
            "next_maintenance_date": asset.next_maintenance_date.isoformat() if asset.next_maintenance_date else None,
            "assigned_to": asset.assigned_to,
            "notes": asset.notes,
            "maintenance_overdue": maintenance_overdue
        })

    return result


@app.post("/assets")
def create_asset(payload: schemas.AssetCreate, db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    asset = models.Asset(
        station_id=payload.station_id or station.id,
        name=payload.name,
        category=payload.category,
        status=payload.status,
        location=payload.location,
        serial_number=payload.serial_number,
        last_maintenance_date=payload.last_maintenance_date,
        next_maintenance_date=payload.next_maintenance_date,
        assigned_to=payload.assigned_to,
        notes=payload.notes
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return {
        "message": "Asset created successfully",
        "asset_id": asset.id
    }


@app.get("/shipments")
def get_shipments(db: Session = Depends(get_db)):
    shipments = db.query(models.Shipment).all()

    result = []

    for shipment in shipments:
        shipment_items = db.query(models.ShipmentItem).filter(
            models.ShipmentItem.shipment_id == shipment.id
        ).all()

        items = []

        for shipment_item in shipment_items:
            item = db.query(models.Item).filter(models.Item.id == shipment_item.item_id).first()

            items.append({
                "shipment_item_id": shipment_item.id,
                "item_id": shipment_item.item_id,
                "item_name": item.name if item else "Unknown",
                "unit": item.unit if item else "",
                "planned_quantity": shipment_item.planned_quantity,
                "weight_kg": shipment_item.weight_kg,
                "volume_m3": shipment_item.volume_m3
            })

        result.append({
            "id": shipment.id,
            "station_id": shipment.station_id,
            "mode": shipment.mode,
            "origin": shipment.origin,
            "status": shipment.status,
            "scheduled_departure": shipment.scheduled_departure.isoformat() if shipment.scheduled_departure else None,
            "expected_arrival": shipment.expected_arrival.isoformat() if shipment.expected_arrival else None,
            "capacity_kg": shipment.capacity_kg,
            "capacity_volume": shipment.capacity_volume,
            "delay_days": shipment.delay_days,
            "items": items
        })

    return result


@app.post("/shipments/{shipment_id}/simulate-delay")
def simulate_shipment_delay(
    shipment_id: int,
    delay_days: int = 0,
    db: Session = Depends(get_db)
):
    shipment = db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.delay_days = delay_days
    db.commit()

    station = db.query(models.Station).filter(models.Station.id == shipment.station_id).first()

    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    return what_if_report(db, station, delay_days)


@app.get("/forecast/inventory-risk")
def inventory_risk(db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    shipment = db.query(models.Shipment).filter(
        models.Shipment.station_id == station.id
    ).first()

    delay_days = shipment.delay_days if shipment else 0

    items = db.query(models.Item).filter(
        models.Item.station_id == station.id
    ).all()

    return [
        forecast_item(db, item, station, delay_days)
        for item in items
    ]


@app.get("/forecast/what-if")
def what_if(delay_days: int = 0, db: Session = Depends(get_db)):
    station = db.query(models.Station).first()

    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    return what_if_report(db, station, delay_days)


@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()

    return [
        {
            "id": alert.id,
            "station_id": alert.station_id,
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
            "entity_type": alert.entity_type,
            "entity_id": alert.entity_id,
            "created_at": alert.created_at.isoformat(),
            "is_read": alert.is_read
        }
        for alert in alerts
    ]


@app.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()

    return {
        "message": "Alert marked as read"
    }