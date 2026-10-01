"""One command that fills the whole demo database, reproducibly.
Run from the REPO ROOT:  python db/seed/generate_demo_data.py
"""
import asyncio
import sys
import socket

# Force IPv4 for all socket connections to fix Neon DB IPv6 blackhole issues
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _getaddrinfo_ipv4
import os
import random
import uuid
from datetime import date, timedelta
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

import asyncpg
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from passlib.hash import bcrypt

load_dotenv(os.path.join("backend", ".env"))

def build_asyncpg_dsn(database_url: str) -> str:
    """Convert SQLAlchemy asyncpg URL to asyncpg DSN format."""
    # Remove the +asyncpg driver suffix
    url = database_url.replace("+asyncpg", "")
    parsed = urlparse(url)
    
    # Parse query parameters
    query_params = parse_qs(parsed.query)
    
    # Convert sslmode to ssl for asyncpg
    if "sslmode" in query_params:
        sslmode = query_params.pop("sslmode")[0]
        # asyncpg uses ssl parameter: "require", "verify-full", "verify-ca", "allow", "prefer", "disable"
        query_params["ssl"] = [sslmode]
    
    # Rebuild query string
    new_query = urlencode(query_params, doseq=True)
    
    # Reconstruct URL without query (asyncpg DSN uses keyword args)
    # asyncpg.connect() prefers keyword arguments, but we can also use DSN string
    # For DSN string, we need to format it properly
    dsn = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    return dsn

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable not set. Check backend/.env")

engine = create_async_engine(DATABASE_URL)

ADMIN = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
LOGI = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000002")
STAT = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000003")
BHA = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001")
MAI = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")


def cid(n: int) -> uuid.UUID:
    return uuid.UUID(f"55555555-5555-5555-5555-{n:012d}")


async def main() -> None:
    rng = random.Random(42)
    
    async with engine.begin() as conn:
        await conn.execute(text("""TRUNCATE users, stations, personnel, voyages, cargo_items,
                              indents, consumption_events, assets, emergency_events,
                              sync_receipts, voyage_assignments, audit_log RESTART IDENTITY CASCADE"""))

        pw = bcrypt.hash("polar123")
        for uid, email, role in ((ADMIN, "admin@ncpor.gov.in", "admin"),
                                 (LOGI, "logistics@ncpor.gov.in", "logistics"),
                                 (STAT, "station.bharati@ncpor.gov.in", "station")):
            await conn.execute(
                text("INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :pw, :role)"),
                {"id": uid, "email": email, "pw": pw, "role": role})

        await conn.execute(
            text("""INSERT INTO stations (id, code, name, geom, next_resupply_date) VALUES
               (:bha, 'BHA', 'Bharati', ST_SetSRID(ST_MakePoint(70.76, -69.41), 4326), '2026-11-15'),
               (:mai, 'MAI', 'Maitri',  ST_SetSRID(ST_MakePoint(11.73, -70.77), 4326), '2026-11-15')"""),
            {"bha": BHA, "mai": MAI})

        await conn.execute(
            text("""INSERT INTO assets (id, serial, name, station_id, status, maintenance_due) VALUES
               ('88888888-0000-0000-0000-000000000001', 'GEN-BHA-01', 'Generator 1', :bha, 'running', false),
               ('88888888-0000-0000-0000-000000000002', 'GEN-BHA-02', 'Generator 2', :bha, 'faulty', true),
               ('88888888-0000-0000-0000-000000000003', 'SNW-MAI-01', 'Snow vehicle', :mai, 'running', false)"""),
            {"bha": BHA, "mai": MAI})

    import seed_voyages, seed_cargo, seed_personnel
    await seed_voyages.main()
    await seed_cargo.main()
    await seed_personnel.main()

    async with engine.begin() as conn:
        await conn.execute(
            text("""INSERT INTO cargo_items (id, name, category, weight_kg, volume_m3, priority, quantity, station_id, asset_id, box_label)
               VALUES ('55555555-5555-5555-5555-000000000011', 'Spare generator GEN-BHA-02', 'spares',
                       450, 1.2, 1, 1, :bha, '88888888-0000-0000-0000-000000000002', '11 of 11')"""),
            {"bha": BHA})

        today = date(2026, 9, 24)
        rows = []
        for day in range(90):
            d = today - timedelta(days=90 - day)
            rows.append({"item": cid(1), "qty": float(rng.randint(140, 170)), "d": d, "stat": STAT})
            rows.append({"item": cid(2), "qty": float(rng.randint(22, 28)), "d": d, "stat": STAT})
            if rng.random() < 0.12:
                rows.append({"item": cid(3), "qty": float(rng.randint(1, 2)), "d": d, "stat": STAT})
            if rng.random() < 0.06:
                rows.append({"item": cid(4), "qty": float(rng.randint(1, 3)), "d": d, "stat": STAT})
        
        await conn.execute(
            text("""INSERT INTO consumption_events (cargo_item_id, quantity, consumed_by, consumed_at)
               VALUES (:item, :qty, :stat, :d)"""),
            rows)

    print("consumption events:", len(rows))
    print("DEMO DATABASE READY — logins: admin@ / logistics@ / station.bharati@  pw: polar123")


if __name__ == "__main__":
    asyncio.run(main())
