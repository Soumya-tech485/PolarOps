"""Fixtures + cleanup guard. ENV=test disables APScheduler inside TestClient."""
import asyncio
import os

os.environ.setdefault("ENV", "test")   # MUST precede app import

import asyncpg
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

load_dotenv(os.path.join("backend", ".env"))
load_dotenv()
from app.main import app  # noqa: E402

DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "")


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "polar123"})
    assert r.status_code == 200, f"seeded login missing for {email} — run generate_demo_data.py"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    return _login(client, "admin@ncpor.gov.in")


@pytest.fixture(scope="session")
def station_headers(client):
    return _login(client, "station.bharati@ncpor.gov.in")


@pytest.fixture(scope="session")
def logistics_headers(client):
    return _login(client, "logistics@ncpor.gov.in")


@pytest.fixture(autouse=True)
def cleanup_test_rows():
    """After every test, delete only TEST- prefixed rows the test created."""
    yield

    async def _clean():
        conn = await asyncpg.connect(DSN)
        await conn.execute("DELETE FROM indents WHERE cargo_item_id IN (SELECT id FROM cargo_items WHERE name LIKE 'TEST-%')")
        await conn.execute("DELETE FROM consumption_events WHERE cargo_item_id IN (SELECT id FROM cargo_items WHERE name LIKE 'TEST-%')")
        await conn.execute("DELETE FROM cargo_items WHERE name LIKE 'TEST-%'")
        await conn.execute("DELETE FROM voyage_assignments WHERE role_on_board LIKE 'TEST-%'")
        await conn.execute("DELETE FROM personnel WHERE full_name LIKE 'TEST-%'")
        await conn.execute("DELETE FROM assets WHERE serial LIKE 'TEST-%'")
        await conn.execute("DELETE FROM emergency_events WHERE payload::text LIKE '%TEST-ESC%'")
        await conn.close()

    asyncio.run(_clean())