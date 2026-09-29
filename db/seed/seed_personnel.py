import asyncio
import os
import uuid

import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace("sslmode=", "ssl=")

BHA = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001")
MAI = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")


def pid(n: int) -> uuid.UUID:
    return uuid.UUID(f"77777777-7777-7777-7777-{n:012d}")


PEOPLE = [
    (1, "A. Sharma", "Station Commander", BHA, "active"),
    (2, "R. Iyer", "Logistics Officer", BHA, "active"),
    (3, "K. Das", "Medical Officer", BHA, "active"),
    (4, "S. Kaur", "Field Technician", BHA, "in_transit"),
    (5, "V. Rao", "Station Commander", MAI, "active"),
    (6, "M. Patel", "Glaciologist", MAI, "active"),
    (7, "T. Singh", "Field Technician", MAI, "emergency"),
    (8, "N. Gupta", "Comms Operator", MAI, "active"),
]


async def main() -> None:
    conn = await asyncpg.connect(DSN)
    for n, name, title, station, status in PEOPLE:
        await conn.execute(
            """INSERT INTO personnel (id, full_name, role_title, station_id, status, last_location, last_update)
               VALUES ($1, $2, $3, $4, $5, $6, now())
               ON CONFLICT (id) DO NOTHING""",
            pid(n), name, title, station, status, f"station:{station}",
        )
    print("personnel seeded:", await conn.fetchval("SELECT count(*) FROM personnel"))
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())