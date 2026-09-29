"""The offline contract: idempotency, ordering, conflicts, parity with REST."""
import uuid
from datetime import datetime, timedelta, timezone

DIESEL = "55555555-5555-5555-5555-000000000001"
VOYAGE = "11111111-1111-1111-1111-111111111111"
PERSON = "77777777-7777-7777-7777-000000000001"
BHA = "bbbbbbbb-0000-0000-0000-000000000001"


def _op(entity, payload, entity_id=None, base_ts=None, minutes_ago=0):
    return {
        "client_uuid": str(uuid.uuid4()),
        "entity": entity,
        "entity_id": entity_id,
        "base_ts": base_ts,
        "client_ts": (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat(),
        "payload": payload,
    }


def test_duplicate_uuid_never_double_applies(client, station_headers):
    before = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()["quantity"]
    op = _op("consumption", {"cargo_item_id": DIESEL, "quantity": 7, "notes": "TEST dup"})
    r1 = client.post("/sync/batch", json={"ops": [op]}, headers=station_headers)
    r2 = client.post("/sync/batch", json={"ops": [op]}, headers=station_headers)
    assert r1.status_code == 200 and r2.status_code == 200
    assert op["client_uuid"] in r1.json()["applied"]
    assert op["client_uuid"] in r2.json()["skipped_duplicate"]
    after = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()["quantity"]
    assert before - after == 7


def test_offline_indent_lifecycle_in_one_burst(client, station_headers, logistics_headers):
    item = client.post("/cargo", json={"name": f"TEST-{uuid.uuid4().hex[:6]}", "category": "spares",
                                       "weight_kg": 3, "volume_m3": 0.02, "priority": 2,
                                       "quantity": 0, "station_id": BHA},
                       headers=logistics_headers).json()
    indent_id = str(uuid.uuid4())
    ops = [
        _op("indent_create", {"id": indent_id, "cargo_item_id": item["id"], "requested_qty": 5}, minutes_ago=30),
        _op("indent_transition", {"step": "clear", "voyage_id": VOYAGE}, entity_id=indent_id, minutes_ago=20),
        _op("indent_transition", {"step": "stow", "stow_position": "TEST-HOLD-Z"}, entity_id=indent_id, minutes_ago=10),
        _op("indent_transition", {"step": "ship"}, entity_id=indent_id, minutes_ago=5),
    ]
    r = client.post("/sync/batch", json={"ops": list(reversed(ops))}, headers=station_headers)
    assert r.status_code == 200
    assert len(r.json()["applied"]) == 4 and r.json()["conflicts"] == []
    shipped = client.get("/indents?status=shipped", headers=station_headers).json()
    mine = next(i for i in shipped if i["id"] == indent_id)
    assert mine["stow_position"] == "TEST-HOLD-Z" and mine["qr_token"]


def test_illegal_transition_rejected_and_logged(client, station_headers, admin_headers):
    item = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()
    indent_id = str(uuid.uuid4())
    ops = [
        _op("indent_create", {"id": indent_id, "cargo_item_id": item["id"], "requested_qty": 1}),
        _op("indent_transition", {"step": "ship"}, entity_id=indent_id),
    ]
    r = client.post("/sync/batch", json={"ops": ops}, headers=station_headers).json()
    assert len(r["applied"]) == 1 and len(r["conflicts"]) == 1
    assert "illegal" in r["conflicts"][0]["reason"]
    audit = client.get("/audit?limit=20", headers=admin_headers).json()
    assert any(row["action"] == "SYNC_CONFLICT" for row in audit)


def test_stale_base_ts_applies_but_flags_conflict(client, station_headers):
    old_ts = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    client.post(f"/personnel/{PERSON}/location",
                json={"last_location": "TEST-base-camp"}, headers=station_headers)
    op = _op("personnel_location", {"last_location": "TEST-field-old"}, entity_id=PERSON, base_ts=old_ts)
    r = client.post("/sync/batch", json={"ops": [op]}, headers=station_headers).json()
    assert op["client_uuid"] in r["applied"]
    assert any(c["client_uuid"] == op["client_uuid"] and "stale" in c["reason"] for c in r["conflicts"])


def test_parity_rest_vs_sync(client, station_headers):
    before = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()["quantity"]
    client.post("/inventory/consumption", json={"cargo_item_id": DIESEL, "quantity": 2}, headers=station_headers)
    via_rest = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()["quantity"]
    op = _op("consumption", {"cargo_item_id": DIESEL, "quantity": 2, "notes": "TEST parity"})
    client.post("/sync/batch", json={"ops": [op]}, headers=station_headers)
    via_sync = client.get(f"/cargo/{DIESEL}", headers=station_headers).json()["quantity"]
    assert via_rest == before - 2 and via_sync == via_rest - 2