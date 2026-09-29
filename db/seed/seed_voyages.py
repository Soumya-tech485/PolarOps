"""Insert the two Nov-Mar season voyages (Cape Town loop, real pattern)."""
import asyncio
import os
import uuid
from datetime import date

import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace("sslmode=", "ssl=")

VOYAGES = [
    ("11111111-1111-1111-1111-111111111111",
     ["Cape Town", "Bharati", "Maitri", "Cape Town"], "2026-11-15", "2027-01-10", 250000, 1200),
    ("22222222-2222-2222-2222-222222222222",
     ["Cape Town", "Maitri", "Bharati", "Cape Town"], "2027-01-20", "2027-03-05", 250000, 1200),
]


async def main() -> None:
    conn = await asyncpg.connect(DSN)
    for vid, route, dep, arr, kg, m3 in VOYAGES:
        await conn.execute(
            """INSERT INTO voyages (id, route, depart_date, arrive_date, status, capacity_kg, capacity_m3)
               VALUES ($1, $2::text[], $3, $4, 'planned', $5, $6)
               ON CONFLICT (id) DO NOTHING""",
            uuid.UUID(vid), route, date.fromisoformat(dep), date.fromisoformat(arr), kg, m3,
        )
    print("voyages seeded:", await conn.fetchval("SELECT count(*) FROM voyages"))
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
