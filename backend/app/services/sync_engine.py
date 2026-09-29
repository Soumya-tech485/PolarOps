"""Offline sync engine: idempotent, ordered, conflict-aware batch apply."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import compute_row_hash
from app.models import (AuditLog, CargoItem, ConsumptionEvent, EmergencyEvent, Indent,
                        Personnel, SyncReceipt)


def _ts(op) -> str:
    return op.client_ts or op.base_ts or ""


async def apply_batch(db: AsyncSession, ops: list, user_id: uuid.UUID) -> dict:
    applied: list[uuid.UUID] = []
    skipped_duplicate: list[uuid.UUID] = []
    conflicts: list[dict] = []

    for op in sorted(ops, key=_ts):
        # 1) idempotency: never apply the same client_uuid twice
        dup = (await db.execute(
            select(SyncReceipt).where(SyncReceipt.client_uuid == op.client_uuid)
        )).scalar_one_or_none()
        if dup is not None:
            skipped_duplicate.append(op.client_uuid)
            continue

        stale = False
        ok = True

        try:
            if op.entity == "consumption":
                item = (await db.execute(select(CargoItem).where(
                    CargoItem.id == op.payload["cargo_item_id"]))).scalar_one_or_none()
                if item is None:
                    ok = False
                    conflicts.append({"client_uuid": op.client_uuid,
                                      "reason": "cargo item not found"})
                else:
                    item.quantity = (item.quantity or 0) - op.payload["quantity"]
                    db.add(ConsumptionEvent(
                        cargo_item_id=item.id, quantity=op.payload["quantity"],
                        consumed_by=user_id, notes=op.payload.get("notes")))

            elif op.entity == "personnel_location":
                person = (await db.execute(select(Personnel).where(
                    Personnel.id == op.entity_id))).scalar_one_or_none()
                if person is None:
                    ok = False
                    conflicts.append({"client_uuid": op.client_uuid,
                                      "reason": "personnel not found"})
                else:
                    if op.base_ts and person.last_update is not None:
                        server_ts = person.last_update
                        if server_ts.tzinfo is None:
                            server_ts = server_ts.replace(tzinfo=timezone.utc)
                        if server_ts.isoformat() > op.base_ts:
                            stale = True
                    person.last_location = op.payload["last_location"]
                    if op.payload.get("status"):
                        person.status = op.payload["status"]
                    person.last_update = datetime.now(timezone.utc)

            elif op.entity == "indent_create":
                db.add(Indent(
                    id=uuid.UUID(op.payload["id"]),
                    cargo_item_id=uuid.UUID(op.payload["cargo_item_id"]),
                    requested_qty=op.payload["requested_qty"],
                    created_by=user_id, status="requested"))

            elif op.entity == "indent_transition":
                indent = (await db.execute(select(Indent).where(
                    Indent.id == op.entity_id))).scalar_one_or_none()
                if indent is None:
                    ok = False
                    conflicts.append({"client_uuid": op.client_uuid,
                                      "reason": "indent not found"})
                else:
                    if op.base_ts and indent.updated_at is not None:
                        server_ts = indent.updated_at
                        if server_ts.tzinfo is None:
                            server_ts = server_ts.replace(tzinfo=timezone.utc)
                        if server_ts.isoformat() > op.base_ts:
                            stale = True
                    step = op.payload["step"]
                    if step == "clear" and indent.status == "requested":
                        indent.status = "cleared"
                        indent.voyage_id = uuid.UUID(op.payload["voyage_id"])
                    elif step == "stow" and indent.status == "cleared":
                        indent.stow_position = op.payload.get("stow_position")
                        indent.qr_token = uuid.uuid4().hex
                    elif step == "ship" and indent.status == "cleared" and indent.stow_position:
                        indent.status = "shipped"
                    elif step == "receive" and indent.status == "shipped":
                        if op.payload.get("qr_token") and op.payload["qr_token"] != indent.qr_token:
                            ok = False
                            conflicts.append({"client_uuid": op.client_uuid,
                                              "reason": "QR token mismatch"})
                        else:
                            indent.status = "received"
                            item = (await db.execute(select(CargoItem).where(
                                CargoItem.id == indent.cargo_item_id))).scalar_one_or_none()
                            if item is not None:
                                item.quantity = (item.quantity or 0) + indent.requested_qty
                    else:
                        ok = False
                        conflicts.append({
                            "client_uuid": op.client_uuid,
                            "reason": f"illegal state transition: indent is '{indent.status}', cannot apply step '{step}'"})
                    indent.updated_at = datetime.now(timezone.utc)

            elif op.entity == "emergency_sos":
                db.add(EmergencyEvent(
                    station_id=uuid.UUID(op.payload["station_id"]),
                    raised_by=user_id, state="SOS_RAISED",
                    payload=op.payload.get("payload")))

            elif op.entity == "emergency_transition":
                event = (await db.execute(select(EmergencyEvent).where(
                    EmergencyEvent.id == op.entity_id))).scalar_one_or_none()
                if event is None:
                    ok = False
                    conflicts.append({"client_uuid": op.client_uuid,
                                      "reason": "emergency event not found"})
                else:
                    from app.services.emergency import TRANSITIONS
                    to_state = op.payload["to_state"]
                    if to_state in TRANSITIONS.get(event.state, {}):
                        event.state = to_state
                    else:
                        ok = False
                        conflicts.append({
                            "client_uuid": op.client_uuid,
                            "reason": f"illegal state transition: emergency is '{event.state}'"})

            else:
                ok = False
                conflicts.append({"client_uuid": op.client_uuid,
                                  "reason": f"unknown entity '{op.entity}'"})

        except Exception as exc:  # never let one bad op kill the batch
            ok = False
            conflicts.append({"client_uuid": op.client_uuid,
                              "reason": f"apply failed: {exc}"})

        if ok:
            db.add(SyncReceipt(client_uuid=op.client_uuid))
            applied.append(op.client_uuid)
            if stale:
                conflicts.append({"client_uuid": op.client_uuid,
                                  "reason": "stale base_ts: applied with last-write-wins"})

    if conflicts:
        tip = (await db.execute(
            select(AuditLog.row_hash).order_by(AuditLog.id.desc()).limit(1)
        )).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        for c in conflicts:
            cu = str(c["client_uuid"])
            details = {"client_uuid": cu, "reason": c["reason"]}
            rh = compute_row_hash(tip, now, str(user_id), "SYNC_CONFLICT", "sync", details)
            db.add(AuditLog(ts=now, user_id=user_id, action="SYNC_CONFLICT",
                            entity="sync", entity_id=c["client_uuid"],
                            details=details, prev_hash=tip, row_hash=rh))
            tip = rh
    await db.commit()

    return {"applied": applied,
            "skipped_duplicate": skipped_duplicate,
            "conflicts": conflicts}

