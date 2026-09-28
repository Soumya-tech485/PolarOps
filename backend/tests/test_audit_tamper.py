"""The DB-level guarantee: the append-only trigger blocks UPDATE and DELETE.

The trigger is FOR EACH ROW, so we first INSERT one row (inserts are allowed),
then prove both modification verbs raise on that exact row.
"""
import asyncio
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))
load_dotenv()
DSN = os.environ["DATABASE_URL"].replace("+asyncpg", "")


async def _run():
    conn = await asyncpg.connect(DSN)
    row_id = await conn.fetchval(
        "INSERT INTO audit_log (action, entity) VALUES ('TEST-tamper-probe', 'test') RETURNING id"
    )
    blocked = 0
    for stmt in (
        "UPDATE audit_log SET action = 'TAMPERED' WHERE id = $1",
        "DELETE FROM audit_log WHERE id = $1",
    ):
        try:
            await conn.execute(stmt, row_id)
        except Exception:
            blocked += 1
    await conn.close()
    assert blocked == 2, "audit_log trigger failed to block UPDATE/DELETE!"


def test_audit_log_rejects_update_and_delete():
    asyncio.run(_run())