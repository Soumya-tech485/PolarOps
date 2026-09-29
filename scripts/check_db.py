import asyncio
import os
import time
import asyncpg
from dotenv import load_dotenv

load_dotenv("backend/.env")
url = os.environ.get("DATABASE_URL", "")
dsn = url.replace("+asyncpg", "")

async def test_db():
    start = time.time()
    try:
        conn = await asyncpg.connect(dsn)
        latency = (time.time() - start) * 1000
        ver = await conn.fetchval("SELECT version()")
        postgis_ver = await conn.fetchval("SELECT postgis_version()")
        
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        table_counts = {}
        for t in tables:
            name = t["table_name"]
            if name == "spatial_ref_sys":
                continue
            cnt = await conn.fetchval(f'SELECT count(*) FROM "{name}"')
            table_counts[name] = cnt
            
        users = await conn.fetch('SELECT email, role FROM users ORDER BY email')
        stations = await conn.fetch('SELECT code, name FROM stations ORDER BY name')
            
        await conn.close()
        
        print("STATUS: ONLINE AND OPERATIONAL")
        print(f"HOST: ep-plain-dream-b7bsn57n-pooler.c-13.us-east-1.aws.neon.tech")
        print(f"DATABASE: neondb")
        print(f"LATENCY: {latency:.1f}ms")
        print(f"POSTGRES VERSION: {ver}")
        print(f"POSTGIS EXTENSION: {postgis_ver}")
        print("\nTABLES AND RECORDS:")
        for tbl, c in table_counts.items():
            print(f"  - {tbl}: {c} rows")
        print("\nREGISTERED USERS:")
        for u in users:
            print(f"  - {u['email']} (role: {u['role']})")
        print("\nEXPEDITION STATIONS:")
        for s in stations:
            print(f"  - {s['name']} ({s['code']})")
            
    except Exception as e:
        print("STATUS: OFFLINE / CONNECTION FAILED")
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_db())
