from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_device
from backend.database import get_db, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api/stock", tags=["stock"])


class StockItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    quantity: int = Field(default=0, ge=-100000, le=100000)
    threshold: int = Field(default=0, ge=0, le=100000)
    purchase_price: float = Field(default=0, ge=0, le=100000000)
    retail_price: float = Field(default=0, ge=0, le=100000000)


class RestockCreate(BaseModel):
    stock_item_id: int
    quantity: int = Field(gt=0, le=100000)
    purchase_price: float | None = Field(default=None, ge=0, le=100000000)
    memo: str | None = Field(default=None, max_length=200)


class InventoryAdjust(BaseModel):
    stock_item_id: int
    quantity: int = Field(ge=0, le=100000)
    memo: str | None = Field(default=None, max_length=200)


def _alert_flag(quantity: int, threshold: int) -> int:
    return 1 if quantity <= threshold else 0


def _record_history(db, stock_item_id: int | None, action: str, quantity: int = 0, memo: str | None = None) -> None:
    db.execute(
        """
        INSERT INTO stock_history (stock_item_id, action, quantity, memo, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (stock_item_id, action, quantity, memo, utc_now_iso()),
    )


@router.get("")
def list_stock(current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT * FROM stock ORDER BY name").fetchall())
    return {"items": rows}


def _create_stock_item(payload: StockItemCreate) -> dict | None:
    now = utc_now_iso()
    alert = _alert_flag(payload.quantity, payload.threshold)
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO stock (name, quantity, threshold, purchase_price, retail_price, alert_flag, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (payload.name, payload.quantity, payload.threshold, payload.purchase_price, payload.retail_price, alert, now),
        )
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (cursor.lastrowid,)).fetchone())
        _record_history(db, cursor.lastrowid, "create", payload.quantity, None)
    return item


@router.post("")
def create_stock_item_alias(payload: StockItemCreate, current: Annotated[dict, Depends(get_current_device)]):
    return {"item": _create_stock_item(payload)}


@router.post("/item")
def create_stock_item(payload: StockItemCreate, current: Annotated[dict, Depends(get_current_device)]):
    return {"item": _create_stock_item(payload)}


@router.patch("/{stock_item_id}")
def update_stock_item(stock_item_id: int, payload: StockItemCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        row = db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Stock item not found")
        db.execute(
            """
            UPDATE stock
            SET name = ?, quantity = ?, threshold = ?, purchase_price = ?, retail_price = ?,
                alert_flag = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.name,
                payload.quantity,
                payload.threshold,
                payload.purchase_price,
                payload.retail_price,
                _alert_flag(payload.quantity, payload.threshold),
                now,
                stock_item_id,
            ),
        )
        _record_history(db, stock_item_id, "update", payload.quantity, None)
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone())
    return {"item": item}


@router.delete("/{stock_item_id}")
def delete_stock_item(stock_item_id: int, current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        row = db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Stock item not found")
        _record_history(db, stock_item_id, "delete", row["quantity"], row["name"])
        db.execute("DELETE FROM stock WHERE id = ?", (stock_item_id,))
    return {"ok": True}


@router.post("/restock")
def restock(payload: RestockCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        row = db.execute("SELECT * FROM stock WHERE id = ?", (payload.stock_item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Stock item not found")

        next_quantity = row["quantity"] + payload.quantity
        next_purchase_price = payload.purchase_price if payload.purchase_price is not None else row["purchase_price"]
        db.execute(
            """
            UPDATE stock
            SET quantity = ?, purchase_price = ?, alert_flag = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                next_quantity,
                next_purchase_price,
                _alert_flag(next_quantity, row["threshold"]),
                now,
                payload.stock_item_id,
            ),
        )
        _record_history(db, payload.stock_item_id, "restock", payload.quantity, payload.memo)
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (payload.stock_item_id,)).fetchone())
    return {"item": item}


@router.post("/inventory")
def inventory_adjust(payload: InventoryAdjust, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        row = db.execute("SELECT * FROM stock WHERE id = ?", (payload.stock_item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Stock item not found")
        diff = payload.quantity - row["quantity"]
        db.execute(
            """
            UPDATE stock
            SET quantity = ?, alert_flag = ?, updated_at = ?
            WHERE id = ?
            """,
            (payload.quantity, _alert_flag(payload.quantity, row["threshold"]), now, payload.stock_item_id),
        )
        _record_history(db, payload.stock_item_id, "inventory", diff, payload.memo)
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (payload.stock_item_id,)).fetchone())
    return {"item": item, "difference": diff}


@router.get("/history")
def list_stock_history(current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT * FROM stock_history ORDER BY created_at DESC LIMIT 100").fetchall())
    return {"items": rows}
