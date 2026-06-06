from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.auth import decode_token, get_current_device
from backend.database import get_db, manager, mark_stale_devices_offline, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(tags=["location"])


class Heartbeat(BaseModel):
    device_id: str
    lat: float | None = None
    lon: float | None = None
    timestamp: str | None = None
    battery: float | None = None


def _upsert_location(device_id: str, payload: Heartbeat | None = None, websocket_online: int | None = None) -> dict | None:
    now = utc_now_iso()
    with get_db() as db:
        existing = db.execute("SELECT * FROM locations WHERE device_id = ?", (device_id,)).fetchone()
        lat = payload.lat if payload and payload.lat is not None else (existing["lat"] if existing else None)
        lon = payload.lon if payload and payload.lon is not None else (existing["lon"] if existing else None)
        battery = payload.battery if payload and payload.battery is not None else (existing["battery"] if existing else None)
        heartbeat_at = payload.timestamp if payload and payload.timestamp else (existing["heartbeat_at"] if existing else now)
        ws_online = websocket_online if websocket_online is not None else (existing["websocket_online"] if existing else 0)

        db.execute(
            """
            INSERT INTO locations (device_id, lat, lon, battery, heartbeat_at, websocket_online, online, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                lat = excluded.lat,
                lon = excluded.lon,
                battery = excluded.battery,
                heartbeat_at = excluded.heartbeat_at,
                websocket_online = excluded.websocket_online,
                online = 1,
                updated_at = excluded.updated_at
            """,
            (device_id, lat, lon, battery, heartbeat_at, ws_online, now),
        )
        return row_to_dict(db.execute("SELECT * FROM locations WHERE device_id = ?", (device_id,)).fetchone())


@router.websocket("/ws/{device_id}/{token}")
async def websocket_endpoint(websocket: WebSocket, device_id: str, token: str):
    current = decode_token(token)
    if current["device_id"] != device_id:
        await websocket.close(code=1008)
        return

    await manager.connect(device_id, websocket)
    location = _upsert_location(device_id, websocket_online=1)
    await manager.broadcast({"type": "device_online", "device_id": device_id, "location": location})

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                data = dict(message.get("payload", {}))
                data["device_id"] = device_id
                payload = Heartbeat(**data)
                location = _upsert_location(device_id, payload, websocket_online=1)
                await manager.broadcast({"type": "location_update", "device_id": device_id, "location": location})
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(device_id, websocket)
        with get_db() as db:
            db.execute(
                "UPDATE locations SET websocket_online = 0, online = 0, updated_at = ? WHERE device_id = ?",
                (utc_now_iso(), device_id),
            )
        await manager.broadcast({"type": "device_offline", "device_id": device_id})


@router.post("/api/heartbeat")
async def heartbeat(payload: Heartbeat, current: Annotated[dict, Depends(get_current_device)]):
    if payload.device_id != current["device_id"]:
        raise HTTPException(status_code=403, detail="Device mismatch")

    location = _upsert_location(payload.device_id, payload)
    await manager.broadcast({"type": "location_update", "device_id": payload.device_id, "location": location})
    return {"ok": True, "location": location}


@router.get("/api/location")
async def get_locations(current: Annotated[dict, Depends(get_current_device)]):
    await mark_stale_devices_offline()
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT * FROM locations ORDER BY device_id").fetchall())
    return {"items": rows}
