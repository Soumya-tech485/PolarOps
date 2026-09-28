"""Personnel movement, asset maintenance flag, and the audit chain behaviour."""
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from app.middleware.audit import compute_row_hash, verify_chain

BHA = "bbbbbbbb-0000-0000-0000-000000000001"
PERSON = "77777777-7777-7777-7777-000000000001"


def test_roster_filters_by_station(client, station_headers):
    r = client.get(f"/personnel?station_id={BHA}", headers=station_headers)
    assert r.status_code == 200
    assert all(p["station_id"] == BHA for p in r.json())


def test_location_update_and_status(client, station_headers):
    r = client.post(f"/personnel/{PERSON}/location",
                    json={"last_location": "TEST-field-camp-3", "status": "in_transit"},
                    headers=station_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["last_location"] == "TEST-field-camp-3"
    assert body["status"] == "in_transit"
    assert body["last_update"]


def test_station_cannot_add_personnel(client, station_headers):
    r = client.post("/personnel", json={"full_name": "TEST Nobody"}, headers=station_headers)
    assert r.status_code == 403


def test_asset_maintenance_flag_flips(client, logistics_headers):
    r = client.post("/assets", json={"serial": f"TEST-{uuid.uuid4().hex[:6]}", "name": "TEST pump",
                                     "station_id": BHA}, headers=logistics_headers)
    assert r.status_code == 201
    asset = r.json()
    assert asset["maintenance_due"] is False
    r = client.post(f"/assets/{asset['id']}/maintenance",
                    json={"maintenance_due": True}, headers=logistics_headers)
    assert r.status_code == 200 and r.json()["maintenance_due"] is True


def test_audit_row_created_for_mutation(client, admin_headers, logistics_headers):
    client.post("/assets", json={"serial": f"TEST-{uuid.uuid4().hex[:6]}", "name": "TEST gen"},
                headers=logistics_headers)
    rows = client.get("/audit?limit=5", headers=admin_headers).json()
    assert any(row["entity"] == "assets" and row["action"].startswith("POST") for row in rows)


def test_audit_redacts_passwords(client, admin_headers):
    client.post("/auth/login", json={"email": "admin@ncpor.gov.in", "password": "polar123"})
    rows = client.get("/audit?limit=10", headers=admin_headers).json()
    for row in [r for r in rows if r["entity"] == "auth"]:
        assert row["details"]["body"].get("password") == "***REDACTED***"


def test_audit_admin_only(client, station_headers):
    assert client.get("/audit", headers=station_headers).status_code == 403


def test_verify_chain_ok_on_live_ledger(client, admin_headers):
    r = client.get("/audit/verify", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_verify_chain_detects_break():
    """Pure unit test: forge a middle row, verify_chain must point at it."""
    ts = datetime.now(timezone.utc)
    rows = []
    prev = None
    for i in range(3):
        details = {"n": i}
        row = SimpleNamespace(
            id=i + 1, ts=ts, user_id=None, action=f"POST /t/{i}", entity="t",
            details=details, prev_hash=prev,
            row_hash=compute_row_hash(prev, ts.isoformat(), None, f"POST /t/{i}", "t", details),
        )
        rows.append(row)
        prev = row.row_hash
    assert verify_chain(rows) is None
    rows[1].details = {"n": 999}
    assert verify_chain(rows) == 2