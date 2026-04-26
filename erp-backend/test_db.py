import asyncio
import asyncpg
import sys
import os
from dotenv import load_dotenv

load_dotenv(".env")

async def test_conn():
    try:
        conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
        print("Success")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_conn())
