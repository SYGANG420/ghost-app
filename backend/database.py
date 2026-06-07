import asyncio
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import sqlcipher3  # type: ignore
except ImportError:  # pragma: no cover - local dev fallback
    sqlcipher3 = None


DB_PATH = Path(os.getenv("GHOST_DB_PATH", "/opt/ghost-app/ghost-app/data/ghost.db"))
DB_KEY = os.getenv("GHOST_DB_KEY", "dev-only-change-me")
OFFLINE_AFTER_SECONDS = 120


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _dict_row_factory(cursor: Any, row: tuple[Any, ...]) -> dict[str, Any]:
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    module = sqlcipher3 if sqlcipher3 is not None else sqlite3
    conn = module.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = _dict_row_factory
    conn.execute(f"PRAGMA key = '{DB_KEY}'")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def init_db() -> None:
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                stock_item_id INTEGER,
                quantity INTEGER NOT NULL DEFAULT 1,
                price REAL NOT NULL,
                cost REAL NOT NULL DEFAULT 0,
                expense REAL NOT NULL DEFAULT 0,
                memo TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                memo TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stock (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                threshold INTEGER NOT NULL DEFAULT 0,
                purchase_price REAL NOT NULL DEFAULT 0,
                alert_flag INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS locations (
                device_id TEXT PRIMARY KEY,
                lat REAL,
                lon REAL,
                battery REAL,
                heartbeat_at TEXT,
                websocket_online INTEGER NOT NULL DEFAULT 0,
                online INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS investments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                investor TEXT NOT NULL,
                amount REAL NOT NULL,
                memo TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS wipe_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                command TEXT NOT NULL DEFAULT 'wipe',
                status TEXT NOT NULL DEFAULT 'pending',
                requested_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                acknowledged_at TEXT
            );
            """
        )


class WebSocketManager:
    def __init__(self) -> None:
        self.active: dict[str, set[Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, device_id: str, websocket: Any) -> None:
        await websocket.accept()
        async with self._lock:
            self.active.setdefault(device_id, set()).add(websocket)

    async def disconnect(self, device_id: str, websocket: Any) -> None:
        async with self._lock:
            sockets = self.active.get(device_id)
            if sockets and websocket in sockets:
                sockets.remove(websocket)
            if sockets is not None and not sockets:
                self.active.pop(device_id, None)

    async def send_to_device(self, device_id: str, payload: dict[str, Any]) -> None:
        sockets = list(self.active.get(device_id, set()))
        for websocket in sockets:
            await websocket.send_text(json.dumps(payload))

    async def broadcast(self, payload: dict[str, Any]) -> None:
        sockets = [socket for group in self.active.values() for socket in group]
        for websocket in sockets:
            await websocket.send_text(json.dumps(payload))


manager = WebSocketManager()


async def mark_stale_devices_offline() -> None:
    cutoff_seconds = OFFLINE_AFTER_SECONDS
    with get_db() as db:
        rows = db.execute("SELECT device_id, heartbeat_at, online FROM locations").fetchall()
        changed: list[str] = []
        for row in rows:
            heartbeat = parse_dt(row["heartbeat_at"])
            is_stale = heartbeat is None or (utc_now() - heartbeat).total_seconds() > cutoff_seconds
            if is_stale and row["online"]:
                db.execute(
                    "UPDATE locations SET online = 0, websocket_online = 0, updated_at = ? WHERE device_id = ?",
                    (utc_now_iso(), row["device_id"]),
                )
                changed.append(row["device_id"])

    for device_id in changed:
        await manager.broadcast({"type": "device_offline", "device_id": device_id})


async def offline_watch_loop() -> None:
    while True:
        await mark_stale_devices_offline()
        await asyncio.sleep(30)
