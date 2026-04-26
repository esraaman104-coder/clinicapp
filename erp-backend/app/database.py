import asyncpg
from .config import settings

from contextlib import asynccontextmanager

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            max_queries=1000,
            max_inactive_connection_lifetime=300
        )
    return _pool

@asynccontextmanager
async def db_connection():
    """
    Async context manager for database connections from the pool.
    التعديل: تم التأكد من أن هذا الـ context manager هو الطريقة الآمنة والوحيدة الموصى بها
    للحصول على اتصال من الـ pool، حيث يضمن إعادة الاتصال تلقائياً عند انتهاء الـ block.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

# تم حذف دالة get_db_connection() لأنها كانت تسبب تسرباً في الاتصالات (Connection Leak)
# حيث كانت تسحب اتصالاً دون ضمان إعادته (release) للـ pool، مما يؤدي لاستنزاف الموارد.

async def check_database_connection():
    """Check if the database is reachable."""
    try:
        # التعديل: استبدال get_db_connection بـ db_connection (context manager)
        # هذا يضمن أن الاتصال المستخدم للفحص سيتم إعادته للـ pool فور انتهاء العملية،
        # بدلاً من إغلاقه نهائياً (close) كما كان يحدث سابقاً، مما يمنع استنزاف الـ pool.
        async with db_connection() as conn:
            await conn.execute("SELECT 1")
        return True
    except Exception:
        return False
