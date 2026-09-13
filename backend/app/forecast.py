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


def calculate_airdrop_payload(db: Session, station: models.Station, days_to_cover: int) -> list:
    """Calculate emergency air-drop payload based on personnel count."""
    personnel_count = db.query(models.Personnel).filter(
        models.Personnel.station_id == station.id,
        models.Personnel.status == "on_station"
    ).count()

    if personnel_count == 0:
        personnel_count = 30  # default assumption

    airdrop_items = []

    critical_items = db.query(models.Item).filter(
        models.Item.station_id == station.id,
        models.Item.criticality.in_(["critical", "high"])
    ).all()

    for item in critical_items:
        if item.category.lower() == "food":
            quantity = personnel_count * days_to_cover * 2  # 2 meals/day
        elif item.category.lower() == "fuel":
            quantity = days_to_cover * 300  # 300L/day station baseline
        elif item.category.lower() == "medical":
            quantity = max(10, personnel_count // 5)
        else:
            quantity = 0

        if quantity > 0:
            airdrop_items.append({
                "item_id": item.id,
                "name": item.name,
                "quantity": quantity,
                "unit": item.unit,
                "weight_kg": quantity * (item.weight_per_unit_kg or 0.85),
                "reason": f"Emergency supply for {personnel_count} personnel over {days_to_cover} days"
            })

    return airdrop_items


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

    # Generate recommended action
    recommended_action = ""
    if risk == "critical":
        if days_remaining == 0:
            recommended_action = f"URGENT: {item.name} is below safety stock. Immediate resupply required."
        else:
            recommended_action = f"Prioritize {item.name} in next shipment. Stockout in {int(days_remaining)} days."
    elif risk == "high":
        shortfall = (adjusted_resupply - today).days - days_remaining
        extra_needed = shortfall * avg_daily_consumption
        recommended_action = f"Add ~{int(extra_needed)} {item.unit} of {item.name} to next shipment to cover delay."
    elif risk == "medium":
        recommended_action = f"Monitor {item.name}. Consider adding to next routine shipment."
    else:
        recommended_action = f"{item.name} stock is sufficient. No action required."

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
        "recommended_action": recommended_action,
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
                "recommended_action": forecast["recommended_action"]
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

    # Air-drop calculator (emergency scenario)
    airdrop_payload = []
    if delay_days >= 30:
        days_to_cover = delay_days
        airdrop_payload = calculate_airdrop_payload(db, station, days_to_cover)

    return {
        "station": station.name,
        "delay_days": delay_days,
        "adjusted_resupply_date": adjusted_resupply.isoformat(),
        "overall_risk": overall_risk,
        "affected_assets": affected_assets,
        "critical_items": critical_items,
        "recommended_cargo": recommended_cargo,
        "all_items": forecasts,
        "emergency_airdrop": airdrop_payload
    }


def optimize_packing(db: Session, item_requests: list, capacity_kg: float, capacity_volume: float) -> dict:
    """
    Greedy knapsack approximation for cargo packing optimization.
    Maximizes priority score per kg/volume.
    """
    # Build candidate list with priority scores
    candidates = []

    for req in item_requests:
        item = db.query(models.Item).filter(models.Item.id == req.item_id).first()
        if not item:
            continue

        weight_kg = req.quantity * (item.weight_per_unit_kg or 0.85)
        volume_m3 = req.quantity * (item.volume_per_unit_m3 or 0.001)

        # Calculate priority score for this item
        forecast = forecast_item(db, item, db.query(models.Station).first(), 0)
        p_score = priority_score(item, forecast["risk"])

        candidates.append({
            "item_id": item.id,
            "name": item.name,
            "category": item.category,
            "unit": item.unit,
            "requested_quantity": req.quantity,
            "weight_kg": weight_kg,
            "volume_m3": volume_m3,
            "priority_score": p_score,
            "risk": forecast["risk"],
            "density_score": p_score / max(weight_kg, 0.01)  # priority per kg
        })

    # Sort by density_score (priority per kg) descending
    candidates.sort(key=lambda x: -x["density_score"])

    # Greedy packing
    packed = []
    remaining_weight = capacity_kg
    remaining_volume = capacity_volume
    total_priority = 0
    stow_position = 1

    for candidate in candidates:
        if candidate["weight_kg"] <= remaining_weight and candidate["volume_m3"] <= remaining_volume:
            candidate["stow_position"] = stow_position
            packed.append(candidate)
            remaining_weight -= candidate["weight_kg"]
            remaining_volume -= candidate["volume_m3"]
            total_priority += candidate["priority_score"]
            stow_position += 1

    utilization = {
        "weight_used_kg": capacity_kg - remaining_weight,
        "weight_capacity_kg": capacity_kg,
        "weight_utilization_pct": round((capacity_kg - remaining_weight) / capacity_kg * 100, 1),
        "volume_used_m3": capacity_volume - remaining_volume,
        "volume_capacity_m3": capacity_volume,
        "volume_utilization_pct": round((capacity_volume - remaining_volume) / capacity_volume * 100, 1),
        "total_priority_score": total_priority
    }

    return {
        "packed_items": packed,
        "utilization": utilization,
        "items_rejected": len(item_requests) - len(packed)
    }