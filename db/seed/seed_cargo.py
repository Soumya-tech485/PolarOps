import asyncio
import os
import uuid

import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace("ssl=", "sslmode=")

BHA = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000001")
MAI = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")


def cid(n: int) -> uuid.UUID:
    return uuid.UUID(f"55555555-5555-5555-5555-{n:012d}")


ITEMS = [
    (1, "Diesel (litres)", "fuel", 0.9, 0.001, 1, 45000, BHA),
    (2, "Rice (kg)", "food", 1.0, 0.002, 1, 3200, BHA),
    (3, "Medical kits", "medical", 12.0, 0.05, 1, 40, BHA),
    (4, "Generator filter", "spares", 2.5, 0.01, 2, 6, BHA),
    (5, "Li-ion battery pack", "spares", 45.0, 0.12, 2, 4, BHA),
    (6, "Diesel (litres)", "fuel", 0.9, 0.001, 1, 38000, MAI),
    (7, "Rice (kg)", "food", 1.0, 0.002, 1, 2600, MAI),
    (8, "Medical kits", "medical", 12.0, 0.05, 1, 35, MAI),
    (9, "Snow-vehicle belt", "spares", 6.0, 0.02, 2, 3, MAI),
    (10, "VSAT spare modem", "comms", 3.0, 0.01, 2, 2, MAI),
]


async def main() -> None:
    conn = await asyncpg.connect(DSN)
    for n, name, cat, kg, m3, prio, qty, station in ITEMS:
        await conn.execute(
            """INSERT INTO cargo_items (id, name, category, weight_kg, volume_m3, priority, quantity, station_id, box_label)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO NOTHING""",
            cid(n), name, cat, kg, m3, prio, qty, station, f"{n} of {len(ITEMS)}",
        )
    print("cargo seeded:", await conn.fetchval("SELECT count(*) FROM cargo_items"))
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())