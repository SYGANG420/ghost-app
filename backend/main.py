import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from backend.auth import router as auth_router
from backend.database import init_db, offline_watch_loop
from backend.routers import kpi, location, sales, stock, wipe

logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

MAX_BODY_BYTES = 1_000_000
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 120
rate_buckets: dict[str, list[float]] = {}
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    offline_task = asyncio.create_task(offline_watch_loop())
    try:
        yield
    finally:
        offline_task.cancel()
        try:
            await offline_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="GHOST CONTROL API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ghost-control.duckdns.org"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_limits(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Request too large"}, status_code=413)

    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = [stamp for stamp in rate_buckets.get(client, []) if now - stamp < RATE_LIMIT_WINDOW]
    if len(bucket) >= RATE_LIMIT_MAX:
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    bucket.append(now)
    rate_buckets[client] = bucket

    return await call_next(request)

app.include_router(auth_router)
app.include_router(sales.router)
app.include_router(stock.router)
app.include_router(location.router)
app.include_router(kpi.router)
app.include_router(wipe.router)


@app.get("/api/health")
def health():
    return {"ok": True}
