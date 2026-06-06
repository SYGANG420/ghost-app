from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_device
from backend.database import get_db, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api/stock", tags=["stock"])


class StockItemCreate(BaseModel):
    name: str
    quantity: int = 0
    threshold: int = 0
    purchase_price: float = 0


class RestockCreate(BaseModel):
    stock_item_id: int
    quantity: int = Field(gt=0)
    purchase_price: float | None = None


def _alert_flag(quantity: int, threshold: int) -> int:
    return 1 if quantity <= threshold else 0


@router.get("")
def list_stock(current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT * FROM stock ORDER BY name").fetchall())
    return {"items": rows}


@router.post("/item")
def create_stock_item(payload: StockItemCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    alert = _alert_flag(payload.quantity, payload.threshold)
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO stock (name, quantity, threshold, purchase_price, alert_flag, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (payload.name, payload.quantity, payload.threshold, payload.purchase_price, alert, now),
        )
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (cursor.lastrowid,)).fetchone())
    return {"item": item}


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
        item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (payload.stock_item_id,)).fetchone())
    return {"item": item}
