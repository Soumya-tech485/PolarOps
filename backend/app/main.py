import hashlib
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional

from .database import SessionLocal, engine, Base, get_db
from . import models, schemas
from .auth import verify_password, create_access_token, require_role, get_current_user
from .seed import seed_db
from .forecast import forecast_item, what_if_report, optimize_packing
import os

app = FastAPI(title="PolarOps API")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def log_audit(db: Session, user_email: str, action: str, entity_type: str, entity_id: int, details: dict = None):
    db.add(models.AuditLog(
        user_email=user_email, action=action,
        entity_type=entity_type, entity_id=entity_id, details=details
    ))
    db.commit()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_db(db)
    db.close()


@app.get("/")
def root():
    return {"message": "PolarOps API is running"}


@app.post("/reset")
def reset_demo_data(
    current_user: models.User = Depends(require_role(["admin"]))
):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_db(db)
    db.close()
    return {"message": "Demo data reset successfully"}


# ============ AUTH ============

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.email, user.role)
    return schemas.TokenResponse(access_token=token, name=user.name, email=user.email, role=user.role)


@app.get("/auth/me")
def me(current_user: models.User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"name": current_user.name, "email": current_user.email, "role": current_user.role}


# ============ DASHBOARD ============

@app.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    if not station:
        raise HTTPException(status_code=404, detail="No station found")

    shipment = db.query(models.Shipment).filter(models.Shipment.station_id == station.id).first()
    delay_days = shipment.delay_days if shipment else 0

    items = db.query(models.Item).filter(models.Item.station_id == station.id).all()
    forecasts = [forecast_item(db, item, station, delay_days) for item in items]

    critical_items = len([f for f in forecasts if f["risk"] in ["critical", "high"]])
    low_stock_items = len([f for f in forecasts if f["current_stock"] <= f["safety_stock"]])

    assets = db.query(models.Asset).filter(models.Asset.station_id == station.id).all()
    operational_assets = len([a for a in assets if a.status.lower() == "operational"])
    maintenance_due_assets = len([a for a in assets if a.status.lower() == "maintenance_due"])

    alerts = db.query(models.Alert).filter(models.Alert.station_id == station.id).all()
    unread_alerts = len([a for a in alerts if not a.is_read])
    high_alerts = len([a for a in alerts if a.severity == "high"])

    personnel_count = db.query(models.Personnel).filter(
        models.Personnel.station_id == station.id,
        models.Personnel.status == "on_station"
    ).count()

    pending_indents = db.query(models.Indent).filter(
        models.Indent.station_id == station.id,
        models.Indent.status == "requested"
    ).count()

    overall_risk = "low"
    if any(f["risk"] == "critical" for f in forecasts):
        overall_risk = "critical"
    elif any(f["risk"] == "high" for f in forecasts):
        overall_risk = "high"
    elif any(f["risk"] == "medium" for f in forecasts):
        overall_risk = "medium"

    return {
        "station": {
            "id": station.id, "name": station.name, "code": station.code,
            "latitude": station.latitude, "longitude": station.longitude,
            "next_resupply_date": station.next_resupply_date.isoformat() if station.next_resupply_date else None
        },
        "overall_risk": overall_risk,
        "inventory": {"total_items": len(items), "critical_items": critical_items, "low_stock_items": low_stock_items},
        "assets": {"total_assets": len(assets), "operational": operational_assets, "maintenance_due": maintenance_due_assets},
        "personnel": {"on_station": personnel_count},
        "indents": {"pending": pending_indents},
        "shipment": {
            "id": shipment.id, "mode": shipment.mode, "origin": shipment.origin, "status": shipment.status,
            "expected_arrival": shipment.expected_arrival.isoformat() if shipment.expected_arrival else None,
            "delay_days": shipment.delay_days
        } if shipment else None,
        "alerts": {"unread": unread_alerts, "high_severity": high_alerts}
    }


# ============ INVENTORY ============

@app.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    if not station:
        raise HTTPException(status_code=404, detail="No station found")
    shipment = db.query(models.Shipment).filter(models.Shipment.station_id == station.id).first()
    delay_days = shipment.delay_days if shipment else 0
    items = db.query(models.Item).filter(models.Item.station_id == station.id).all()
    return [forecast_item(db, item, station, delay_days) for item in items]


@app.post("/inventory")
def create_item(
    payload: schemas.ItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "logistics_officer"]))
):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    item = models.Item(
        station_id=payload.station_id or station.id, name=payload.name, category=payload.category,
        unit=payload.unit, current_stock=payload.current_stock, safety_stock=payload.safety_stock,
        criticality=payload.criticality, default_daily_consumption=payload.default_daily_consumption,
        weight_per_unit_kg=payload.weight_per_unit_kg, volume_per_unit_m3=payload.volume_per_unit_m3,
        expiry_date=payload.expiry_date
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit(db, current_user.email, "create_item", "item", item.id, {"name": item.name})
    return forecast_item(db, item, station, 0)


# ============ CONSUMPTION ============

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
            "id": log.id, "item_id": log.item_id,
            "item_name": item.name if item else "Unknown",
            "quantity": log.quantity, "logged_at": log.logged_at.isoformat(),
            "logged_by": log.logged_by, "notes": log.notes
        })
    return result


@app.post("/consumption")
def create_consumption(
    payload: schemas.ConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "station_manager"]))
):
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
    item = db.query(models.Item).filter(models.Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.quantity > item.current_stock:
        raise HTTPException(status_code=400, detail="Cannot consume more than current stock")

    item.current_stock = item.current_stock - payload.quantity
    log = models.ConsumptionLog(
        station_id=item.station_id, item_id=item.id, quantity=payload.quantity,
        logged_by=current_user.email, notes=payload.notes
    )
    db.add(log)

    if item.current_stock <= item.safety_stock:
        db.add(models.Alert(
            station_id=item.station_id, severity="high",
            title=f"{item.name} below safety stock",
            message=f"{item.name} stock is {item.current_stock} {item.unit}, below safety stock {item.safety_stock}.",
            entity_type="item", entity_id=item.id
        ))

    db.commit()
    log_audit(db, current_user.email, "consumption_logged", "item", item.id,
              {"quantity": payload.quantity, "notes": payload.notes})
    return {"message": "Consumption logged successfully", "item_id": item.id,
            "item_name": item.name, "current_stock": item.current_stock}


# ============ ASSETS ============

@app.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(models.Asset).all()
    today = date.today()
    result = []
    for asset in assets:
        maintenance_overdue = asset.next_maintenance_date and asset.next_maintenance_date < today
        result.append({
            "id": asset.id, "station_id": asset.station_id, "name": asset.name,
            "category": asset.category, "status": asset.status, "location": asset.location,
            "serial_number": asset.serial_number,
            "last_maintenance_date": asset.last_maintenance_date.isoformat() if asset.last_maintenance_date else None,
            "next_maintenance_date": asset.next_maintenance_date.isoformat() if asset.next_maintenance_date else None,
            "assigned_to": asset.assigned_to, "notes": asset.notes,
            "maintenance_overdue": maintenance_overdue
        })
    return result


# ============ WORK ORDERS ============

@app.get("/work-orders")
def get_work_orders(db: Session = Depends(get_db)):
    work_orders = db.query(models.WorkOrder).order_by(models.WorkOrder.created_at.desc()).all()
    result = []
    for wo in work_orders:
        asset = db.query(models.Asset).filter(models.Asset.id == wo.asset_id).first()
        result.append({
            "id": wo.id, "asset_id": wo.asset_id,
            "asset_name": asset.name if asset else "Unknown",
            "description": wo.description, "status": wo.status,
            "created_by": wo.created_by, "created_at": wo.created_at.isoformat(),
            "completed_at": wo.completed_at.isoformat() if wo.completed_at else None,
            "completed_by": wo.completed_by,
            "spare_parts_used": wo.spare_parts_used
        })
    return result


@app.post("/work-orders")
def create_work_order(
    payload: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "station_manager"]))
):
    asset = db.query(models.Asset).filter(models.Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    wo = models.WorkOrder(
        asset_id=payload.asset_id, station_id=asset.station_id,
        description=payload.description, status="open",
        created_by=current_user.email, spare_parts_used=payload.spare_parts
    )
    db.add(wo)
    db.commit()
    db.refresh(wo)
    log_audit(db, current_user.email, "work_order_created", "work_order", wo.id,
              {"asset_id": payload.asset_id})
    return {"message": "Work order created", "work_order_id": wo.id}


@app.post("/work-orders/{work_order_id}/complete")
def complete_work_order(
    work_order_id: int,
    payload: schemas.WorkOrderComplete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "station_manager"]))
):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if wo.status == "completed":
        raise HTTPException(status_code=400, detail="Work order already completed")

    for part in payload.spare_parts_used:
        item = db.query(models.Item).filter(models.Item.id == part["item_id"]).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item ID {part['item_id']} not found")
        if item.current_stock < part["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {item.name}: need {part['quantity']}, have {item.current_stock}"
            )

    for part in payload.spare_parts_used:
        item = db.query(models.Item).filter(models.Item.id == part["item_id"]).first()
        item.current_stock -= part["quantity"]

        db.add(models.ConsumptionLog(
            station_id=wo.station_id, item_id=part["item_id"],
            quantity=part["quantity"], logged_by=current_user.email,
            notes=f"Work order #{wo.id} - {wo.description}"
        ))

    wo.status = "completed"
    wo.completed_at = datetime.utcnow()
    wo.completed_by = current_user.email
    wo.spare_parts_used = payload.spare_parts_used

    db.commit()
    log_audit(db, current_user.email, "work_order_completed", "work_order", wo.id,
              {"spare_parts_used": payload.spare_parts_used})
    return {"message": "Work order completed", "work_order_id": wo.id}


# ============ SHIPMENTS ============

@app.get("/shipments")
def get_shipments(db: Session = Depends(get_db)):
    shipments = db.query(models.Shipment).all()
    result = []
    for shipment in shipments:
        shipment_items = db.query(models.ShipmentItem).filter(
            models.ShipmentItem.shipment_id == shipment.id
        ).order_by(models.ShipmentItem.stow_position).all()
        items = []
        for si in shipment_items:
            item = db.query(models.Item).filter(models.Item.id == si.item_id).first()
            items.append({
                "shipment_item_id": si.id, "item_id": si.item_id,
                "item_name": item.name if item else "Unknown",
                "unit": item.unit if item else "",
                "planned_quantity": si.planned_quantity,
                "weight_kg": si.weight_kg, "volume_m3": si.volume_m3,
                "stow_position": si.stow_position
            })
        result.append({
            "id": shipment.id, "station_id": shipment.station_id,
            "mode": shipment.mode, "origin": shipment.origin, "status": shipment.status,
            "scheduled_departure": shipment.scheduled_departure.isoformat() if shipment.scheduled_departure else None,
            "expected_arrival": shipment.expected_arrival.isoformat() if shipment.expected_arrival else None,
            "capacity_kg": shipment.capacity_kg, "capacity_volume": shipment.capacity_volume,
            "delay_days": shipment.delay_days, "items": items
        })
    return result


@app.post("/shipments/{shipment_id}/simulate-delay")
def simulate_shipment_delay(
    shipment_id: int, delay_days: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "logistics_officer"]))
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


# ============ INDENTS (eCon-style Cargo Lifecycle) ============

@app.get("/indents")
def get_indents(db: Session = Depends(get_db)):
    indents = db.query(models.Indent).order_by(models.Indent.requested_at.desc()).all()
    result = []
    for indent in indents:
        item = db.query(models.Item).filter(models.Item.id == indent.item_id).first()
        result.append({
            "id": indent.id, "station_id": indent.station_id,
            "item_id": indent.item_id, "item_name": item.name if item else "Unknown",
            "item_unit": item.unit if item else "",
            "quantity": indent.quantity, "requested_by": indent.requested_by,
            "requested_at": indent.requested_at.isoformat(),
            "status": indent.status, "cleared_by": indent.cleared_by,
            "cleared_at": indent.cleared_at.isoformat() if indent.cleared_at else None,
            "qr_token": indent.qr_token,
            "shipment_id": indent.shipment_id, "stow_position": indent.stow_position,
            "notes": indent.notes
        })
    return result


@app.post("/indents")
def create_indent(
    payload: schemas.IndentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "station_manager"]))
):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    if not station:
        raise HTTPException(status_code=404, detail="No station found")
    item = db.query(models.Item).filter(models.Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    qr_token = hashlib.md5(f"indent-{datetime.utcnow().isoformat()}-{payload.item_id}".encode()).hexdigest()[:16]

    indent = models.Indent(
        station_id=station.id, item_id=payload.item_id, quantity=payload.quantity,
        requested_by=current_user.email, status="requested",
        qr_token=qr_token, notes=payload.notes
    )
    db.add(indent)

    db.add(models.Alert(
        station_id=station.id, severity="medium",
        title=f"New cargo indent: {payload.quantity} {item.unit} of {item.name}",
        message=f"Station requested {payload.quantity} {item.unit} of {item.name}. Awaiting clearance.",
        entity_type="indent"
    ))

    db.commit()
    db.refresh(indent)
    log_audit(db, current_user.email, "indent_created", "indent", indent.id,
              {"item": item.name, "quantity": payload.quantity})
    return {"message": "Indent created, awaiting clearance", "indent_id": indent.id, "qr_token": indent.qr_token}


@app.post("/indents/{indent_id}/clear")
def clear_indent(
    indent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "logistics_officer"]))
):
    indent = db.query(models.Indent).filter(models.Indent.id == indent_id).first()
    if not indent:
        raise HTTPException(status_code=404, detail="Indent not found")
    if indent.status != "requested":
        raise HTTPException(status_code=400, detail="Indent already processed")

    indent.status = "cleared"
    indent.cleared_by = current_user.email
    indent.cleared_at = datetime.utcnow()

    shipment = db.query(models.Shipment).filter(models.Shipment.station_id == indent.station_id).first()
    if shipment:
        item = db.query(models.Item).filter(models.Item.id == indent.item_id).first()
        weight_kg = indent.quantity * (item.weight_per_unit_kg or 0.85)
        volume_m3 = indent.quantity * (item.volume_per_unit_m3 or 0.001)

        max_pos = db.query(models.ShipmentItem).filter(
            models.ShipmentItem.shipment_id == shipment.id
        ).count()

        si = models.ShipmentItem(
            shipment_id=shipment.id, item_id=indent.item_id,
            planned_quantity=indent.quantity, weight_kg=weight_kg,
            volume_m3=volume_m3, stow_position=max_pos + 1
        )
        db.add(si)
        indent.shipment_id = shipment.id
        indent.stow_position = max_pos + 1

    db.commit()
    db.refresh(indent)
    log_audit(db, current_user.email, "indent_cleared", "indent", indent.id, {})
    return {"message": "Indent cleared and added to manifest", "stow_position": indent.stow_position}


@app.post("/indents/{indent_id}/reject")
def reject_indent(
    indent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "logistics_officer"]))
):
    indent = db.query(models.Indent).filter(models.Indent.id == indent_id).first()
    if not indent:
        raise HTTPException(status_code=404, detail="Indent not found")
    if indent.status != "requested":
        raise HTTPException(status_code=400, detail="Indent already processed")
    indent.status = "rejected"
    indent.cleared_by = current_user.email
    indent.cleared_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.email, "indent_rejected", "indent", indent.id, {})
    return {"message": "Indent rejected"}


@app.post("/indents/{indent_id}/receive")
def receive_indent(
    indent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "station_manager"]))
):
    indent = db.query(models.Indent).filter(models.Indent.id == indent_id).first()
    if not indent:
        raise HTTPException(status_code=404, detail="Indent not found")
    if indent.status not in ["cleared", "loaded"]:
        raise HTTPException(status_code=400, detail="Indent not ready for receipt")

    item = db.query(models.Item).filter(models.Item.id == indent.item_id).first()
    item.current_stock += indent.quantity

    indent.status = "received"
    db.commit()
    log_audit(db, current_user.email, "indent_received", "indent", indent.id,
              {"item": item.name, "quantity": indent.quantity})
    return {"message": f"Cargo received. Station stock updated: +{indent.quantity} {item.unit}",
            "new_stock": item.current_stock}


# ============ PERSONNEL ============

@app.get("/personnel")
def get_personnel(db: Session = Depends(get_db)):
    personnel = db.query(models.Personnel).all()
    today = date.today()
    result = []
    for p in personnel:
        clearance_days_remaining = None
        clearance_status = "valid"
        if p.medical_clearance_expiry:
            clearance_days_remaining = (p.medical_clearance_expiry - today).days
            if clearance_days_remaining < 0:
                clearance_status = "expired"
            elif clearance_days_remaining < 30:
                clearance_status = "expiring_soon"

        result.append({
            "id": p.id, "station_id": p.station_id, "name": p.name,
            "role": p.role,
            "medical_clearance_expiry": p.medical_clearance_expiry.isoformat() if p.medical_clearance_expiry else None,
            "clearance_days_remaining": clearance_days_remaining,
            "clearance_status": clearance_status,
            "assigned_gear": p.assigned_gear, "status": p.status,
            "emergency_contact": p.emergency_contact
        })
    return result


# ============ FORECASTING ============

@app.get("/forecast/inventory-risk")
def inventory_risk(db: Session = Depends(get_db)):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    if not station:
        raise HTTPException(status_code=404, detail="No station found")
    shipment = db.query(models.Shipment).filter(models.Shipment.station_id == station.id).first()
    delay_days = shipment.delay_days if shipment else 0
    items = db.query(models.Item).filter(models.Item.station_id == station.id).all()
    return [forecast_item(db, item, station, delay_days) for item in items]


@app.get("/forecast/what-if")
def what_if(delay_days: int = 0, db: Session = Depends(get_db)):
    station = db.query(models.Station).filter(models.Station.code == "BHARATI").first()
    if not station:
        raise HTTPException(status_code=404, detail="No station found")
    return what_if_report(db, station, delay_days)


# ============ PACKING OPTIMIZATION ============

@app.post("/optimize-packing")
def packing_optimization(
    payload: schemas.PackingOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "logistics_officer"]))
):
    result = optimize_packing(db, payload.items, payload.capacity_kg, payload.capacity_volume)
    log_audit(db, current_user.email, "packing_optimization_run", "optimization", 0,
              {"capacity_kg": payload.capacity_kg, "capacity_volume": payload.capacity_volume})
    return result


# ============ ALERTS ============

@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()
    return [{
        "id": alert.id, "station_id": alert.station_id, "severity": alert.severity,
        "title": alert.title, "message": alert.message,
        "entity_type": alert.entity_type, "entity_id": alert.entity_id,
        "created_at": alert.created_at.isoformat(), "is_read": alert.is_read
    } for alert in alerts]


@app.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read"}


# ============ AUDIT LOG ============

@app.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": log.id, "user_email": log.user_email, "action": log.action,
        "entity_type": log.entity_type, "entity_id": log.entity_id,
        "details": log.details, "created_at": log.created_at.isoformat()
    } for log in logs]