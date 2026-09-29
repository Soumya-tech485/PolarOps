"""RED TEAM PROOF 1: Split-Brain Conflict Resolution.
Two offline devices edit the same record; server applies last-write-wins AND audits it."""
import uuid
from datetime import datetime, timedelta, timezone

PERSON = "77777777-7777-7777-7777-000000000001"


def _op(entity, payload, entity_id=None, base_ts=None, minutes_ago=0):
    return {
        "client_uuid": str(uuid.uuid4()), "entity": entity, "entity_id": entity_id,
        "base_ts": base_ts,
        "client_ts": (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat(),
        "payload": payload,
    }


def test_split_brain_last_write_wins_and_logs(client, station_headers, admin_headers):
    t0 = datetime.now(timezone.utc).isoformat()

    op_a = _op("personnel_location", {"last_location": "TEST-DeviceA-Camp"},
               entity_id=PERSON, base_ts=t0, minutes_ago=10)
    res_a = client.post("/sync/batch", json={"ops": [op_a]}, headers=station_headers).json()
    assert op_a["client_uuid"] in res_a["applied"]

    op_b = _op("personnel_location", {"last_location": "TEST-DeviceB-Camp"},
               entity_id=PERSON, base_ts=t0, minutes_ago=5)
    res_b = client.post("/sync/batch", json={"ops": [op_b]}, headers=station_headers).json()
    assert op_b["client_uuid"] in res_b["applied"]
    assert any(c["client_uuid"] == op_b["client_uuid"] and "stale" in c["reason"]
               for c in res_b["conflicts"])

    audit = client.get("/audit?limit=10", headers=admin_headers).json()
    assert any(r["action"] == "SYNC_CONFLICT" for r in audit)
    print("\n[RED TEAM PASS] Split-brain resolved via Last-Write-Wins and permanently audited.")