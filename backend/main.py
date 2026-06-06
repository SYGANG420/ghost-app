import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import router as auth_router
from backend.database import init_db, offline_watch_loop
from backend.routers import kpi, location, sales, stock, wipe


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sales.router)
app.include_router(stock.router)
app.include_router(location.router)
app.include_router(kpi.router)
app.include_router(wipe.router)


@app.get("/api/health")
def health():
    return {"ok": True}
