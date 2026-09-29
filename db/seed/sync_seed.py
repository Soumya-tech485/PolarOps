import asyncio
import os
import random
import uuid
from datetime import date, timedelta
from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv(os.path.join("backend", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")

if "ssl=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("ssl=", "sslmode=")

import psycopg2
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""TRUNCATE users, stations, personnel, voyages, cargo_items,
                      indents, consumption_events, assets, emergency_events,
                      sync_receipts, voyage_assignments, audit_log RESTART IDENTITY CASCADE""")

ADMIN = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
LOGI = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000002")
STAT = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000003")
BHA = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001")
MAI = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")

pw = bcrypt.hash("polar123")
for uid, email, role in ((ADMIN, "admin@ncpor.gov.in", "admin"),
                         (LOGI, "logistics@ncpor.gov.in", "logistics"),
                         (STAT, "station.bharati@ncpor.gov.in", "station")):
    cur.execute(
        "INSERT INTO users (id, email, password_hash, role) VALUES (%s, %s, %s, %s)",
        (str(uid), email, pw, role))

cur.execute(
    """INSERT INTO stations (id, code, name, geom, next_resupply_date) VALUES
       (%s, 'BHA', 'Bharati', ST_SetSRID(ST_MakePoint(70.76, -69.41), 4326), '2026-11-15'),
       (%s, 'MAI', 'Maitri',  ST_SetSRID(ST_MakePoint(11.73, -70.77), 4326), '2026-11-15')""",
    (str(BHA), str(MAI)))

# Voyages
VOYAGES = [
    ("11111111-1111-1111-1111-111111111111",
     ["Cape Town", "Bharati", "Maitri", "Cape Town"], "2026-11-15", "2027-01-10", 250000, 1200),
    ("22222222-2222-2222-2222-222222222222",
     ["Cape Town", "Maitri", "Bharati", "Cape Town"], "2027-01-20", "2027-03-05", 250000, 1200),
]
for vid, route, dep, arr, kg, m3 in VOYAGES:
    cur.execute(
        """INSERT INTO voyages (id, route, depart_date, arrive_date, status, capacity_kg, capacity_m3)
           VALUES (%s, %s::text[], %s, %s, 'planned', %s, %s)
           ON CONFLICT (id) DO NOTHING""",
        (vid, route, dep, arr, kg, m3)
    )

# Assets
cur.execute(
    """INSERT INTO assets (id, serial, name, station_id, status, maintenance_due) VALUES
       ('88888888-0000-0000-0000-000000000001', 'GEN-BHA-01', 'Generator 1', %s, 'running', false),
       ('88888888-0000-0000-0000-000000000002', 'GEN-BHA-02', 'Generator 2', %s, 'faulty', true),
       ('88888888-0000-0000-0000-000000000003', 'SNW-MAI-01', 'Snow vehicle', %s, 'running', false)""",
    (str(BHA), str(BHA), str(MAI)))

# Cargo
cur.execute(
    """INSERT INTO cargo_items (id, name, category, weight_kg, volume_m3, priority, quantity, station_id, asset_id, box_label)
       VALUES ('55555555-5555-5555-5555-000000000011', 'Spare generator GEN-BHA-02', 'spares',
               450, 1.2, 1, 1, %s, '88888888-0000-0000-0000-000000000002', '11 of 11')""",
    (str(BHA),))

print("Seeded successfully via psycopg2")
cur.close()
conn.close()
