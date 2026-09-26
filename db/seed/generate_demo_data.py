db/seed/generate_demo_data.py

"""One command that fills the whole demo database, reproducibly.
Run from the REPO ROOT:  python db/seed/generate_demo_data.py
"""
import asyncio
import os
import random
import uuid
from datetime import date, timedelta

import asyncpg
from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv(os.path.join("backend", ".env"))
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "")

ADMIN = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
LOGI = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000002")
STAT = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000003")
BHA = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001")
MAI = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")


def cid(n: int) -> uuid.UUID:
    return uuid.UUID(f"55555555-5555-5555-5555-{n:012d}")


async def main() -> None:
    rng = random.Random(42)
    conn = await asyncpg.connect(DSN)

    await conn.execute("""TRUNCATE users, stations, personnel, voyages, cargo_items,
                          indents, consumption_events, assets, emergency_events,
                          sync_receipts, voyage_assignments RESTART IDENTITY CASCADE""")

    pw = bcrypt.hash("polar123")
    for uid, email, role in ((ADMIN, "admin@ncpor.gov.in", "admin"),
                             (LOGI, "logistics@ncpor.gov.in", "logistics"),
                             (STAT, "station.bharati@ncpor.gov.in", "station")):
        await conn.execute(
            "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)",
            uid, email, pw, role)

    await conn.execute(
        """INSERT INTO stations (id, code, name, geom, next_resupply_date) VALUES
           ($1, 'BHA', 'Bharati', ST_SetSRID(ST_MakePoint(70.76, -69.41), 4326), '2026-11-15'),
           ($2, 'MAI', 'Maitri',  ST_SetSRID(ST_MakePoint(11.73, -70.77), 4326), '2026-11-15')""",
        BHA, MAI)

    await conn.execute(
        """INSERT INTO assets (id, serial, name, station_id, status, maintenance_due) VALUES
           ('88888888-0000-0000-0000-000000000001', 'GEN-BHA-01', 'Generator 1', $1, 'running', false),
           ('88888888-0000-0000-0000-000000000002', 'GEN-BHA-02', 'Generator 2', $1, 'faulty', true),
           ('88888888-0000-0000-0000-000000000003', 'SNW-MAI-01', 'Snow vehicle', $2, 'running', false)""",
        BHA, BHA, MAI)

    await conn.close()

    import seed_voyages, seed_cargo, seed_personnel
    await seed_voyages.main()
    await seed_cargo.main()
    await seed_personnel.main()

    conn = await asyncpg.connect(DSN)

    # Priority-1 line tied to the FAULTY generator: optimizer must refuse it
    await conn.execute(
        """INSERT INTO cargo_items (id, name, category, weight_kg, volume_m3, priority, quantity, station_id, asset_id, box_label)
           VALUES ('55555555-5555-5555-5555-000000000011', 'Spare generator GEN-BHA-02', 'spares',
                   450, 1.2, 1, 1, $1, '88888888-0000-0000-0000-000000000002', '11 of 11')""",
        BHA)

    today = date(2026, 9, 24)
    rows = []
    for day in range(90):
        d = today - timedelta(days=90 - day)
        rows.append((cid(1), float(rng.randint(140, 170)), d))
        rows.append((cid(2), float(rng.randint(22, 28)), d))
        if rng.random() < 0.12:
            rows.append((cid(3), float(rng.randint(1, 2)), d))
        if rng.random() < 0.06:
            rows.append((cid(4), float(rng.randint(1, 3)), d))
    await conn.executemany(
        """INSERT INTO consumption_events (cargo_item_id, quantity, consumed_by, consumed_at)
           VALUES ($1, $2, $3, $4::date)""",
        [(item, qty, STAT, d.isoformat()) for item, qty, d in rows])
    print("consumption events:", len(rows))
    print("DEMO DATABASE READY — logins: admin@ / logistics@ / station.bharati@  pw: polar123")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())