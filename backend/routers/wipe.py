import asyncio
import json
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_device, require_admin
from backend.database import get_db, manager, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api/wipe", tags=["wipe"])
WIPE_CONFIRM_TOKEN = "CONFIRM_WIPE"
VPS_CONFIRM_TOKEN = "CONFIRM_VPS"
WIPE_AUDIT_LOG = Path("/opt/ghost-app/ghost-app/data/wipe_audit.log")


class WipePayload(BaseModel):
    reason: str | None = Field(default=None, max_length=200)
    confirmation_token: str | None = Field(default=None, max_length=80)

    class Config:
        extra = "forbid"


class DeadmanPayload(BaseModel):
    enabled: bool
    hours: int = Field(default=72, ge=24, le=72)

    class Config:
        extra = "forbid"


class ConfirmTokenRequest(BaseModel):
    kind: Literal["device", "vps"]

    class Config:
        extra = "forbid"


class ConfirmTokenResponse(BaseModel):
    confirmation_token: str
    expires_in_seconds: int = 60


def _write_wipe_audit(entry: dict) -> None:
    WIPE_AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    with WIPE_AUDIT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


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


@router.post("/confirm-token", response_model=ConfirmTokenResponse)
def issue_wipe_confirm_token(payload: ConfirmTokenRequest, admin: Annotated[dict, Depends(require_admin)]):
    token = VPS_CONFIRM_TOKEN if payload.kind == "vps" else WIPE_CONFIRM_TOKEN
    return ConfirmTokenResponse(confirmation_token=token)


@router.get("/{device_id}/status")
def get_wipe_status(device_id: str, current: Annotated[dict, Depends(get_current_device)]):
    if current["device_id"] != device_id and current.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Device mismatch")
    with get_db() as db:
        rows = rows_to_dicts(
            db.execute(
                "SELECT * FROM wipe_commands WHERE device_id = ? ORDER BY created_at DESC LIMIT 10",
                (device_id,),
            ).fetchall()
        )
    return {"items": rows}


@router.delete("/{device_id}")
def cancel_wipe(device_id: str, admin: Annotated[dict, Depends(require_admin)]):
    now = utc_now_iso()
    with get_db() as db:
        db.execute(
            """
            UPDATE wipe_commands
            SET status = 'cancelled', acknowledged_at = ?
            WHERE device_id = ? AND status = 'pending'
            """,
            (now, device_id),
        )
    return {"ok": True}


@router.post("/{device_id}/deadman")
def update_deadman(device_id: str, payload: DeadmanPayload, current: Annotated[dict, Depends(get_current_device)]):
    if current["device_id"] != device_id and current.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Device mismatch")
    hours = payload.hours if payload.hours in {24, 48, 72} else 72
    now = utc_now_iso()
    with get_db() as db:
        db.execute(
            """
            INSERT INTO deadman_settings (device_id, enabled, hours, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                enabled = excluded.enabled,
                hours = excluded.hours,
                updated_at = excluded.updated_at
            """,
            (device_id, 1 if payload.enabled else 0, hours, now),
        )
        item = row_to_dict(db.execute("SELECT * FROM deadman_settings WHERE device_id = ?", (device_id,)).fetchone())
    return {"item": item}


@router.post("/vps")
async def request_vps_self_destruct(payload: WipePayload, admin: Annotated[dict, Depends(require_admin)]):
    if payload.confirmation_token != VPS_CONFIRM_TOKEN:
        raise HTTPException(status_code=400, detail="Confirmation token required")
    await asyncio.sleep(5)
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO wipe_commands (device_id, command, status, requested_by, created_at)
            VALUES ('vps', 'self_destruct', 'pending', ?, ?)
            """,
            (admin["device_id"], utc_now_iso()),
        )
        command = row_to_dict(db.execute("SELECT * FROM wipe_commands WHERE id = ?", (cursor.lastrowid,)).fetchone())

    _write_wipe_audit({
        "type": "vps_self_destruct",
        "requested_by": admin["device_id"],
        "reason": payload.reason,
        "created_at": command["created_at"],
        "command_id": command["id"],
    })
    await manager.broadcast({"type": "vps_self_destruct_flag", "command": command, "reason": payload.reason})
    return {"command": command, "destructive_action_executed": False}


@router.post("/{device_id}")
async def request_wipe(device_id: str, payload: WipePayload, admin: Annotated[dict, Depends(require_admin)]):
    if device_id not in {"device_a", "device_b", "all"}:
        raise HTTPException(status_code=404, detail="Device not found")
    if payload.confirmation_token != WIPE_CONFIRM_TOKEN:
        raise HTTPException(status_code=400, detail="Confirmation token required")
    await asyncio.sleep(5)
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO wipe_commands (device_id, command, status, requested_by, created_at)
            VALUES (?, 'wipe', 'pending', ?, ?)
            """,
            (device_id, admin["device_id"], utc_now_iso()),
        )
        command = row_to_dict(db.execute("SELECT * FROM wipe_commands WHERE id = ?", (cursor.lastrowid,)).fetchone())

    _write_wipe_audit({
        "type": "device_wipe",
        "device_id": device_id,
        "requested_by": admin["device_id"],
        "reason": payload.reason,
        "created_at": command["created_at"],
        "command_id": command["id"],
    })
    await manager.broadcast({"type": "wipe_command", "device_id": device_id, "command": command, "reason": payload.reason})
    return {"command": command}
