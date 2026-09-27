"""CP-SAT cargo packing (PS#2 mathematics) + the maintenance-linked rule."""
import secrets
import time
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from ortools.sat.python import cp_model
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Asset, CargoItem, Indent, Voyage

LOAD_COMMITTED = ("shipped", "received")


@dataclass
class Candidate:
    indent_id: uuid.UUID
    item_name: str
    qty: float
    weight_kg: float
    volume_m3: float
    priority: int
    excluded_reason: str | None = None


def build_and_solve(
    candidates: list[Candidate],
    capacity_kg: float | None,
    capacity_m3: float | None,
    time_limit: float = 2.0,
) -> tuple[list[Candidate], list[Candidate], str, float]:
    """Pure solver core — unit-testable with zero database."""
    eligible = [c for c in candidates if not c.excluded_reason]
    model = cp_model.CpModel()
    x = {c.indent_id: model.NewBoolVar(f"load_{i}") for i, c in enumerate(eligible)}

    if eligible and capacity_kg is not None:
        model.Add(
            sum(int(round(c.qty * c.weight_kg * 1000)) * x[c.indent_id] for c in eligible)
            <= int(round(capacity_kg * 1000))
        )
    if eligible and capacity_m3 is not None:
        model.Add(
            sum(int(round(c.qty * c.volume_m3 * 1000)) * x[c.indent_id] for c in eligible)
            <= int(round(capacity_m3 * 1000))
        )
    model.Maximize(sum(int(round((6 - c.priority) * c.qty)) * x[c.indent_id] for c in eligible))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    t0 = time.perf_counter()
    state = solver.Solve(model)
    seconds = time.perf_counter() - t0

    status_name = solver.StatusName(state)
    chosen_ids = set()
    if state in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        chosen_ids = {c.indent_id for c in eligible if solver.Value(x[c.indent_id]) == 1}
    selected = [c for c in eligible if c.indent_id in chosen_ids]
    rejected = [c for c in candidates if c.excluded_reason] + [
        c for c in eligible if c.indent_id not in chosen_ids
    ]
    for c in rejected:
        if not c.excluded_reason:
            c.excluded_reason = "capacity or score"
    return selected, rejected, status_name, seconds


async def _committed_load(db: AsyncSession, voyage_id) -> tuple[float, float]:
    rows = (
        await db.execute(
            select(Indent, CargoItem)
            .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
            .where(Indent.voyage_id == voyage_id, Indent.status.in_(LOAD_COMMITTED))
        )
    ).all()
    kg = sum(float(i.requested_qty) * float(c.weight_kg or 0) for i, c in rows)
    m3 = sum(float(i.requested_qty) * float(c.volume_m3 or 0) for i, c in rows)
    return kg, m3


async def solve_loading(db: AsyncSession, voyage_id, apply: bool) -> dict:
    voyage = await db.get(Voyage, voyage_id)
    if voyage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voyage not found")

    rows = (
        await db.execute(
            select(Indent, CargoItem)
            .join(CargoItem, Indent.cargo_item_id == CargoItem.id)
            .where(Indent.voyage_id == voyage_id, Indent.status == "cleared")
            .order_by(CargoItem.priority, Indent.created_at)
        )
    ).all()

    candidates: list[Candidate] = []
    for indent, item in rows:
        reason = None
        if item.asset_id is not None:
            asset = await db.get(Asset, item.asset_id)
            if asset is not None and asset.maintenance_due:
                reason = f"asset {asset.serial} due for maintenance — cannot ship"
        candidates.append(Candidate(
            indent_id=indent.id, item_name=item.name,
            qty=float(indent.requested_qty), weight_kg=float(item.weight_kg or 0),
            volume_m3=float(item.volume_m3 or 0), priority=int(item.priority or 3),
            excluded_reason=reason,
        ))

    used_kg, used_m3 = await _committed_load(db, voyage_id)
    free_kg = (float(voyage.capacity_kg) - used_kg) if voyage.capacity_kg is not None else None
    free_m3 = (float(voyage.capacity_m3) - used_m3) if voyage.capacity_m3 is not None else None

    selected, rejected, status_name, seconds = build_and_solve(candidates, free_kg, free_m3)

    manifest = []
    for n, c in enumerate(sorted(selected, key=lambda c: c.priority)):
        position = f"HOLD-{chr(65 + n // 10)}-{n % 10:02d}"
        manifest.append({"indent_id": c.indent_id, "item_name": c.item_name,
                         "qty": c.qty, "weight_kg": c.weight_kg,
                         "stow_position": position if apply else None})
        if apply:
            indent = await db.get(Indent, c.indent_id)
            indent.stow_position = position
            indent.qr_token = indent.qr_token or secrets.token_urlsafe(16)
    if apply:
        await db.commit()

    return {
        "voyage_id": voyage_id,
        "selected": manifest,
        "rejected": [{"indent_id": c.indent_id, "item_name": c.item_name,
                      "reason": c.excluded_reason} for c in rejected],
        "used_kg": round(used_kg + sum(c.qty * c.weight_kg for c in selected), 1),
        "used_m3": round(used_m3 + sum(c.qty * c.volume_m3 for c in selected), 3),
        "capacity_kg": float(voyage.capacity_kg) if voyage.capacity_kg is not None else None,
        "capacity_m3": float(voyage.capacity_m3) if voyage.capacity_m3 is not None else None,
        "solver_status": status_name,
        "solve_seconds": round(seconds, 3),
    }