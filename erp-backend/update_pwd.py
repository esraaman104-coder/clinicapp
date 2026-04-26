import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def update():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    await conn.execute("UPDATE users SET password_hash = '$2b$12$KdFNhdy9XALLzDDlPUUSy.0T.eVZlkIaN2tReMoQElEww5kYaMrDa' WHERE email = 'admin@erp.com'")
    await conn.close()
    print('Updated!')

asyncio.run(update())
