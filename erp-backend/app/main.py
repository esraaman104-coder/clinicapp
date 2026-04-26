import redis.asyncio as aioredis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import os

from .auth.router import router as auth_router
from .modules.branches.router import router as branches_router
from .modules.users.router import router as users_router
from .modules.products.router import router as products_router
from .modules.stock.router import router as stock_router
from .modules.sales.router import router as sales_router
from .modules.customers.router import router as customers_router
from .modules.payments.router import router as payments_router
from .modules.suppliers.router import router as suppliers_router
from .modules.purchases.router import router as purchases_router
from .modules.reports.router import router as reports_router
from .modules.logs.router import router as logs_router
from .modules.categories.router import router as categories_router
from .modules.warehouses.router import router as warehouses_router

# ─── Rate Limiting ────────────────────────────────────────────────────────────
RATE_LIMIT_REQUESTS = 120
RATE_LIMIT_WINDOW   = 60
_redis_client: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        from .config import settings
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client

# ─── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ─── Lifespan — pool warm-up & clean shutdown ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    from .database import get_pool
    await get_pool()          # دفء الـ pool عند البدء
    await get_redis()         # دفء Redis عند البدء
    yield
    from .database import _pool
    if _pool:
        await _pool.close()   # إغلاق نظيف عند الإيقاف
    if _redis_client:
        await _redis_client.aclose()

app = FastAPI(title="ERP مواد البناء API", lifespan=lifespan)

# ─── Middleware: Rate Limiting + Security Headers ─────────────────────────────
@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    
    try:
        redis = await get_redis()
        key = f"rate_limit:{client_ip}"
        
        pipe = redis.pipeline()
        await pipe.zremrangebyscore(key, 0, window_start)
        await pipe.zcard(key)
        await pipe.zadd(key, {str(now): now})
        await pipe.expire(key, RATE_LIMIT_WINDOW * 2)
        results = await pipe.execute()
        
        request_count = results[1]
        remaining = max(0, RATE_LIMIT_REQUESTS - request_count - 1)
        reset_time = int(now + RATE_LIMIT_WINDOW)

        if request_count >= RATE_LIMIT_REQUESTS:
            return Response(
                content='{"detail":"Too many requests"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(RATE_LIMIT_WINDOW),
                    "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                },
            )
    except Exception:
        # إذا فشل Redis، نسمح بالطلب ولا نوقف التطبيق
        remaining = RATE_LIMIT_REQUESTS - 1

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/api")
app.include_router(branches_router,   prefix="/api")
app.include_router(users_router,      prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(products_router,   prefix="/api")
app.include_router(warehouses_router, prefix="/api")
app.include_router(stock_router,      prefix="/api")
app.include_router(sales_router,      prefix="/api")
app.include_router(customers_router,  prefix="/api")
app.include_router(payments_router,   prefix="/api")
app.include_router(suppliers_router,  prefix="/api")
app.include_router(purchases_router,  prefix="/api")
app.include_router(reports_router,    prefix="/api")
app.include_router(logs_router,       prefix="/api")

# ─── CORS (بعد الـ routers دائماً) ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Root Endpoints ───────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Welcome to Materials ERP API", "status": "online"}

@app.get("/api/health")
async def health_check():
    from .database import check_database_connection
    db_ok = await check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
