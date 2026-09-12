from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from . import models


def get_average_daily_consumption(db: Session, item: models.Item) -> float:
    start_date = datetime.utcnow() - timedelta(days=30)

    logs = db.query(models.ConsumptionLog).filter(
        models.ConsumptionLog.item_id == item.id,
        models.ConsumptionLog.logged_at >= start_date
    ).all()

    total = sum(log.quantity for log in logs)

    if total > 0:
        return round(total / 30.0, 2)

    return item.default_daily_consumption or 0.0


def priority_score(item: models.Item, risk: str) -> int:
    score = 0

    criticality_scores = {
        "critical": 40,
        "high": 30,
        "medium": 15,
        "low": 5
    }

    risk_scores = {
        "critical": 40,
        "high": 30,
        "medium": 15,
        "low": 0
    }

    score += criticality_scores.get(item.criticality, 5)
    score += risk_scores.get(risk, 0)

    if item.current_stock <= item.safety_stock:
        score += 20

    important_categories = [
        "fuel",
        "medical",
        "life support",
        "communications",
        "maintenance"
    ]

    if item.category.lower() in important_categories:
        score += 10

    return score


def forecast_item(
    db: Session,
    item: models.Item,
    station: models.Station,
    delay_days: int = 0
):
    avg_daily_consumption = get_average_daily_consumption(db, item)

    effective_stock = item.current_stock - item.safety_stock

    if effective_stock <= 0:
        days_remaining = 0
    elif avg_daily_consumption <= 0:
        days_remaining = 999
    else:
        days_remaining = effective_stock / avg_daily_consumption

    today = date.today()

    if station.next_resupply_date:
        adjusted_resupply = station.next_resupply_date + timedelta(days=delay_days)
    else:
        adjusted_resupply = today + timedelta(days=90)

    stockout_date = None
    if days_remaining < 999:
        stockout_date = today + timedelta(days=int(days_remaining))

    if item.current_stock <= item.safety_stock or days_remaining <= 7:
        risk = "critical"
    elif stockout_date and stockout_date < adjusted_resupply:
        risk = "high"
    elif days_remaining <= 30:
        risk = "medium"
    else:
        risk = "low"

    if item.current_stock <= item.safety_stock:
        reason = "Stock is at or below safety stock."
    elif stockout_date and stockout_date < adjusted_resupply:
        reason = f"Projected stockout before adjusted resupply on {adjusted_resupply.isoformat()}."
    elif days_remaining <= 30:
        reason = "Stock buffer is below 30 days."
    else:
        reason = "Stock level is sufficient for current planning window."

    recommended_quantity = 0

    if avg_daily_consumption > 0:
        days_to_cover = (adjusted_resupply - today).days + 14
        if days_to_cover > 0:
            target_stock = (avg_daily_consumption * days_to_cover) + item.safety_stock
            recommended_quantity = max(0, round(target_stock - item.current_stock))

    return {
        "item_id": item.id,
        "name": item.name,
        "category": item.category,
        "unit": item.unit,
        "criticality": item.criticality,
        "current_stock": item.current_stock,
        "safety_stock": item.safety_stock,
        "average_daily_consumption": avg_daily_consumption,
        "days_remaining": round(days_remaining, 1),
        "stockout_date": stockout_date.isoformat() if stockout_date else None,
        "next_resupply_date": station.next_resupply_date.isoformat() if station.next_resupply_date else None,
        "adjusted_resupply_date": adjusted_resupply.isoformat(),
        "risk": risk,
        "reason": reason,
        "recommended_quantity": recommended_quantity
    }


def what_if_report(db: Session, station: models.Station, delay_days: int):
    items = db.query(models.Item).filter(
        models.Item.station_id == station.id
    ).all()

    forecasts = []

    for item in items:
        forecast = forecast_item(db, item, station, delay_days)
        forecast["priority_score"] = priority_score(item, forecast["risk"])
        forecasts.append(forecast)

    risk_order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3
    }

    forecasts.sort(
        key=lambda x: (
            risk_order.get(x["risk"], 4),
            -x["priority_score"]
        )
    )

    critical_items = [
        f for f in forecasts
        if f["risk"] in ["critical", "high"]
    ]

    recommended_cargo = []

    for forecast in forecasts:
        if (
            forecast["risk"] in ["critical", "high"]
            or forecast["current_stock"] <= forecast["safety_stock"]
            or forecast["recommended_quantity"] > 0
        ):
            recommended_cargo.append({
                "item_id": forecast["item_id"],
                "item": forecast["name"],
                "unit": forecast["unit"],
                "risk": forecast["risk"],
                "priority_score": forecast["priority_score"],
                "recommended_quantity": forecast["recommended_quantity"],
                "reason": forecast["reason"]
            })

    recommended_cargo.sort(key=lambda x: -x["priority_score"])
    recommended_cargo = recommended_cargo[:5]

    assets = db.query(models.Asset).filter(
        models.Asset.station_id == station.id
    ).all()

    affected_assets = len([
        asset for asset in assets
        if asset.status.lower() != "operational"
    ])

    overall_risk = "low"

    if any(f["risk"] == "critical" for f in forecasts):
        overall_risk = "critical"
    elif any(f["risk"] == "high" for f in forecasts):
        overall_risk = "high"
    elif any(f["risk"] == "medium" for f in forecasts):
        overall_risk = "medium"

    adjusted_resupply = station.next_resupply_date + timedelta(days=delay_days)

    return {
        "station": station.name,
        "delay_days": delay_days,
        "adjusted_resupply_date": adjusted_resupply.isoformat(),
        "overall_risk": overall_risk,
        "affected_assets": affected_assets,
        "critical_items": critical_items,
        "recommended_cargo": recommended_cargo,
        "all_items": forecasts
    }