
"""SOS state machine: legal moves, role walls, illegal 409s, 48-hour escalation."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))
load_dotenv()
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "")
BHA = "bbbbbbbb-0000-0000-0000-000000000001"


def test_sos_lifecycle_and_role_walls(client, station_headers, logistics_headers, admin_headers):
    ev = client.post("/emergency/sos", json={"station_id": BHA, "payload": {"tag": "TEST-life"}},
                     headers=station_headers).json()
    assert ev["state"] == "SOS_RAISED"
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "STATION_RESPONSE"},
                       headers=station_headers).status_code == 200
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "ESCALATED_SAR"},
                       headers=station_headers).status_code == 403
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "ESCALATED_SAR"},
                       headers=logistics_headers).status_code == 200
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "RESOLVED"},
                       headers=logistics_headers).status_code == 403
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "RESOLVED"},
                       headers=admin_headers).status_code == 200
    assert client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "SOS_RAISED"},
                       headers=admin_headers).status_code == 409


def test_illegal_jump_is_409(client, station_headers, logistics_headers):
    ev = client.post("/emergency/sos", json={"station_id": BHA}, headers=station_headers).json()
    r = client.post(f"/emergency/{ev['id']}/transition", json={"to_state": "RESOLVED"},
                    headers=logistics_headers)
    assert r.status_code == 409


def test_48h_escalation_check(client, admin_headers):
    async def _backdate():
        conn = await asyncpg.connect(DSN)
        old = datetime.now(timezone.utc) - timedelta(hours=49)
        await conn.execute(
            "INSERT INTO emergency_events (station_id, raised_at, state, payload) "
            "VALUES ($1, $2, 'STATION_RESPONSE', '{\"tag\": \"TEST-ESC\"}')",
            uuid.UUID(BHA), old)
        await conn.close()

    asyncio.run(_backdate())
    r = client.post("/emergency/run-escalation-check", headers=admin_headers)
    assert r.status_code == 200 and r.json()["count"] >= 1