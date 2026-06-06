from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.auth import get_current_device, require_admin
from backend.database import get_db, manager, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api/wipe", tags=["wipe"])


class WipePayload(BaseModel):
    reason: str | None = None


@router.post("/vps")
async def request_vps_self_destruct(payload: WipePayload, admin: Annotated[dict, Depends(require_admin)]):
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO wipe_commands (device_id, command, status, requested_by, created_at)
            VALUES ('vps', 'self_destruct', 'pending', ?, ?)
            """,
            (admin["device_id"], utc_now_iso()),
        )
        command = row_to_dict(db.execute("SELECT * FROM wipe_commands WHERE id = ?", (cursor.lastrowid,)).fetchone())

    await manager.broadcast({"type": "vps_self_destruct_flag", "command": command, "reason": payload.reason})
    return {"command": command, "destructive_action_executed": False}


@router.post("/{device_id}")
async def request_wipe(device_id: str, payload: WipePayload, admin: Annotated[dict, Depends(require_admin)]):
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO wipe_commands (device_id, command, status, requested_by, created_at)
            VALUES (?, 'wipe', 'pending', ?, ?)
            """,
            (device_id, admin["device_id"], utc_now_iso()),
        )
        command = row_to_dict(db.execute("SELECT * FROM wipe_commands WHERE id = ?", (cursor.lastrowid,)).fetchone())

    await manager.broadcast({"type": "wipe_command", "device_id": device_id, "command": command, "reason": payload.reason})
    return {"command": command}


@router.get("/check")
def check_wipe(current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        rows = rows_to_dicts(
            db.execute(
                """
                SELECT * FROM wipe_commands
                WHERE device_id IN (?, 'all') AND status = 'pending'
                ORDER BY created_at ASC
                """,
                (current["device_id"],),
            ).fetchall()
        )
    return {"items": rows}
