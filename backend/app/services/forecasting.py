"""Explainable forecasting & risk service (PS#3 intelligence).

LOCKED LAW: every number produced here can be recomputed by hand on paper.
"""
import math
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, CargoItem, ConsumptionEvent, Station

LOOKBACK_DAYS = 90
SBC_ADI_CUTOFF = 1.32


def classify_demand(series: list[float]) -> tuple[str, float, float]:
    """Return ('intermittent'|'continuous', ADI, CV2)."""
    nonzero = [x for x in series if x > 0]
    if not nonzero:
        return "continuous", 0.0, 0.0
    adi = len(series) / len(nonzero)
    mean = sum(nonzero) / len(nonzero)
    var = sum((x - mean) ** 2 for x in nonzero) / len(nonzero)
    cv2 = (var / (mean * mean)) if mean else 0.0
    return ("intermittent" if adi >= SBC_ADI_CUTOFF else "continuous"), adi, cv2


def croston_sba(series: list[float], alpha: float = 0.1) -> float:
    """Croston's method + SBA bias correction."""
    first_idx = next((i for i, x in enumerate(series) if x > 0), None)
    if first_idx is None:
        return 0.0
    d_hat = series[first_idx]
    z_hat = float(first_idx + 1)
    since = 0
    for x in series[first_idx + 1:]:
        since += 1
        if x > 0:
            d_hat = alpha * x + (1 - alpha) * d_hat
            z_hat = alpha * since + (1 - alpha) * z_hat
            since = 0
    if z_hat <= 0:
        return 0.0
    return (d_hat / z_hat) * (1 - alpha / 2)


def moving_average(series: list[float], window: int = 30) -> float:
    tail = series[-window:]
    return (sum(tail) / len(tail)) if tail else 0.0


def demand_rate(series: list[float]) -> tuple[float, str]:
    kind, _, _ = classify_demand(series)
    if kind == "intermittent":
        return croston_sba(series), "croston_sba"
    return moving_average(series), "moving_average"


def days_to_stockout(quantity: float, rate: float) -> int | None:
    if rate <= 0:
        return None
    return int(math.floor(quantity / rate))


def risk_tier(days: int | None, eta_days: int) -> str:
    if days is None:
        return "stable"
    if days < eta_days:
        return "critical"
    if days < int(eta_days * 1.5):
        return "warning"
    return "stable"


def recommended_action(tier: str) -> str:
    return {
        "critical": "EMERGENCY: ration now + air-drop candidate",
        "warning": "Prioritize in next packing manifest",
        "stable": "Monitor at nightly recompute",
    }[tier]


async def daily_series(db: AsyncSession, item_id, lookback: int = LOOKBACK_DAYS) -> list[float]:
    """90-day daily consumption vector with zero-days filled in."""
    since = datetime.now(timezone.utc) - timedelta(days=lookback)
    rows = (
        await db.execute(
            select(func.date(ConsumptionEvent.consumed_at), func.sum(ConsumptionEvent.quantity))
            .where(ConsumptionEvent.cargo_item_id == item_id, ConsumptionEvent.consumed_at >= since)
            .group_by(func.date(ConsumptionEvent.consumed_at))
        )
    ).all()
    by_day = {d: float(q) for d, q in rows}
    start = datetime.now(timezone.utc).date() - timedelta(days=lookback - 1)
    return [by_day.get(start + timedelta(days=i), 0.0) for i in range(lookback)]


def eta_days_for(station: Station) -> int:
    if station.next_resupply_date:
        return max(0, (station.next_resupply_date - date.today()).days)
    return 30


async def forecast_for_item(db: AsyncSession, item: CargoItem, eta_days: int) -> dict:
    series = await daily_series(db, item.id)
    rate, method = demand_rate(series)
    days = days_to_stockout(float(item.quantity or 0), rate)
    tier = risk_tier(days, eta_days)
    return {
        "item_id": item.id, "name": item.name, "category": item.category,
        "quantity": float(item.quantity or 0), "rate_per_day": round(rate, 4),
        "method": method, "days_remaining": days, "risk_tier": tier,
        "recommended_action": recommended_action(tier),
    }


async def forecast_for_station(db: AsyncSession, station_id) -> dict:
    station = await db.get(Station, station_id)
    if station is None:
        return {"station_id": station_id, "eta_days": None, "lines": []}
    eta = eta_days_for(station)
    items = (await db.execute(select(CargoItem).where(CargoItem.station_id == station_id))).scalars().all()
    
    if not items:
        return {"station_id": station_id, "eta_days": eta, "lines": []}
        
    item_ids = [i.id for i in items]
    since = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    
    # Bulk fetch consumption events for all items
    rows = (
        await db.execute(
            select(
                ConsumptionEvent.cargo_item_id, 
                func.date(ConsumptionEvent.consumed_at), 
                func.sum(ConsumptionEvent.quantity)
            )
            .where(
                ConsumptionEvent.cargo_item_id.in_(item_ids),
                ConsumptionEvent.consumed_at >= since
            )
            .group_by(ConsumptionEvent.cargo_item_id, func.date(ConsumptionEvent.consumed_at))
        )
    ).all()
    
    from collections import defaultdict
    consumption_map = defaultdict(dict)
    for c_id, d, q in rows:
        consumption_map[c_id][d] = float(q)
        
    start = datetime.now(timezone.utc).date() - timedelta(days=LOOKBACK_DAYS - 1)
    
    lines = []
    for item in items:
        by_day = consumption_map.get(item.id, {})
        series = [by_day.get(start + timedelta(days=i), 0.0) for i in range(LOOKBACK_DAYS)]
        rate, method = demand_rate(series)
        days = days_to_stockout(float(item.quantity or 0), rate)
        tier = risk_tier(days, eta)
        lines.append({
            "item_id": item.id, "name": item.name, "category": item.category,
            "quantity": float(item.quantity or 0), "rate_per_day": round(rate, 4),
            "method": method, "days_remaining": days, "risk_tier": tier,
            "recommended_action": recommended_action(tier),
        })
        
    lines.sort(key=lambda l: (l["risk_tier"] != "critical", l["risk_tier"] != "warning", l["name"]))
    return {"station_id": station_id, "eta_days": eta, "lines": lines}


async def what_if(db: AsyncSession, station_id, delay_days: int) -> dict:
    """Re-solve the future with the ship delayed — the judge-favourite demo."""
    base = await forecast_for_station(db, station_id)
    new_eta = (base["eta_days"] or 30) + delay_days
    lines = []
    airdrop = []
    for line in base["lines"]:
        tier = risk_tier(line["days_remaining"], new_eta)
        new_line = dict(line, risk_tier=tier, recommended_action=recommended_action(tier))
        lines.append(new_line)
        if tier == "critical":
            shortfall = line["rate_per_day"] * new_eta - line["quantity"]
            if shortfall > 0:
                airdrop.append({"item_id": line["item_id"], "name": line["name"],
                                "shortfall": round(shortfall, 1)})
    airdrop.sort(key=lambda a: -a["shortfall"])
    return {"delay_days": delay_days, "new_eta_days": new_eta, "lines": lines, "airdrop": airdrop}


async def nightly_critical_scan() -> None:
    """APScheduler 02:00 job: any CRITICAL line writes an ALERT row into the ledger."""
    from app.core.database import AsyncSessionLocal
    from app.middleware.audit import compute_row_hash

    async with AsyncSessionLocal() as db:
        for sid in (await db.execute(select(Station.id))).scalars().all():
            report = await forecast_for_station(db, sid)
            for line in report["lines"]:
                if line["risk_tier"] != "critical":
                    continue
                ts = datetime.now(timezone.utc)
                details = {"station": str(sid), "item": line["name"], "days": line["days_remaining"]}
                prev = (await db.execute(
                    select(AuditLog.row_hash).order_by(AuditLog.id.desc()).limit(1)
                )).scalar_one_or_none()
                db.add(AuditLog(
                    ts=ts, user_id=None, action="ALERT:RESTOCK_CRITICAL", entity="forecast",
                    entity_id=line["item_id"], details=details, prev_hash=prev,
                    row_hash=compute_row_hash(prev, ts.isoformat(), None,
                                              "ALERT:RESTOCK_CRITICAL", "forecast", details),
                ))
        await db.commit()