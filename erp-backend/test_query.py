import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def test():
    try:
        pool = await asyncpg.create_pool(os.getenv('DATABASE_URL'), min_size=2, max_size=5)
        async with pool.acquire() as conn:
            user = await conn.fetchrow("SELECT * FROM users WHERE email = $1 AND is_active = TRUE", "admin@erp.com")
            print(dict(user) if user else "Not found")
        await pool.close()
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
