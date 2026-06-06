from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from backend.auth import get_current_device
from backend.database import get_db, manager, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api", tags=["sales"])


class SaleCreate(BaseModel):
    stock_item_id: int | None = None
    quantity: int = Field(default=1, ge=1)
    price: float = Field(ge=0)
    cost: float = Field(default=0, ge=0)
    expense: float = Field(default=0, ge=0)
    memo: str | None = None


class ExpenseCreate(BaseModel):
    amount: float = Field(ge=0)
    category: str = "general"
    memo: str | None = None
    created_at: str | None = None


def _update_stock_alert(db, stock_item_id: int) -> dict | None:
    row = db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone()
    if row is None:
        return None
    alert = 1 if row["quantity"] <= row["threshold"] else 0
    db.execute(
        "UPDATE stock SET alert_flag = ?, updated_at = ? WHERE id = ?",
        (alert, utc_now_iso(), stock_item_id),
    )
    item = row_to_dict(db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone())
    return item


@router.post("/sales")
async def create_sale(payload: SaleCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO sales (device_id, stock_item_id, quantity, price, cost, expense, memo, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current["device_id"],
                payload.stock_item_id,
                payload.quantity,
                payload.price,
                payload.cost,
                payload.expense,
                payload.memo,
                now,
            ),
        )
        sale_id = cursor.lastrowid
        stock_item = None
        if payload.stock_item_id is not None:
            db.execute(
                "UPDATE stock SET quantity = quantity - ?, updated_at = ? WHERE id = ?",
                (payload.quantity, now, payload.stock_item_id),
            )
            stock_item = _update_stock_alert(db, payload.stock_item_id)
        sale = row_to_dict(db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone())

    if stock_item and stock_item["alert_flag"]:
        await manager.broadcast({"type": "stock_alert", "item": stock_item})

    await manager.broadcast({"type": "sale_created", "sale": sale})
    return {"sale": sale, "stock": stock_item}


@router.get("/sales")
def list_sales(
    current: Annotated[dict, Depends(get_current_device)],
    month: str | None = Query(default=None),
):
    where = ""
    params: list[str] = []
    if month:
        where = "WHERE substr(created_at, 1, 7) = ?"
        params.append(month)

    with get_db() as db:
        rows = rows_to_dicts(db.execute(f"SELECT * FROM sales {where} ORDER BY created_at DESC", params).fetchall())
        total_sales = sum(item["price"] for item in rows)
        total_cost = sum(item["cost"] for item in rows)
        total_expense = sum(item["expense"] for item in rows)
        total_gross = total_sales - total_cost - total_expense

    return {
        "items": rows,
        "summary": {
            "month": month,
            "count": len(rows),
            "sales": total_sales,
            "cost": total_cost,
            "expense": total_expense,
            "gross": total_gross,
        },
    }


@router.post("/expenses")
def create_expense(payload: ExpenseCreate, current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO expenses (device_id, amount, category, memo, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (current["device_id"], payload.amount, payload.category, payload.memo, payload.created_at or utc_now_iso()),
        )
        expense = row_to_dict(db.execute("SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)).fetchone())
    return {"expense": expense}
