import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def test():
    try:
        pool = await asyncpg.create_pool(os.getenv('DATABASE_URL'), min_size=2, max_size=5)
        async with pool.acquire() as conn:
            print(await conn.fetchval('SELECT 1'))
        await pool.close()
    except Exception as e:
        print(f"Pool failed: {e}")

asyncio.run(test())
