from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth import get_current_device
from backend.database import get_db, manager, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api", tags=["sales"])


class SaleCreate(BaseModel):
    stock_item_id: int | None = None
    quantity: int = Field(default=1, ge=1, le=100000)
    price: float = Field(ge=0, le=100000000)
    cost: float = Field(default=0, ge=0, le=100000000)
    expense: float = Field(default=0, ge=0, le=100000000)
    delivery_fee: float = Field(default=0, ge=0, le=100000000)
    staff: str | None = Field(default=None, max_length=1)
    sale_date: str | None = Field(default=None, max_length=10)
    memo: str | None = Field(default=None, max_length=200)


class ExpenseCreate(BaseModel):
    amount: float = Field(ge=0, le=100000000)
    category: str = Field(default="general", max_length=60)
    memo: str | None = Field(default=None, max_length=200)
    created_at: str | None = Field(default=None, max_length=40)


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


def _adjust_stock(db, stock_item_id: int | None, delta: int) -> dict | None:
    if stock_item_id is None or delta == 0:
        return None
    row = db.execute("SELECT * FROM stock WHERE id = ?", (stock_item_id,)).fetchone()
    if row is None:
        return None
    db.execute(
        "UPDATE stock SET quantity = quantity + ?, updated_at = ? WHERE id = ?",
        (delta, utc_now_iso(), stock_item_id),
    )
    return _update_stock_alert(db, stock_item_id)


@router.post("/sales")
async def create_sale(payload: SaleCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO sales (device_id, stock_item_id, quantity, price, cost, expense, delivery_fee, staff, sale_date, memo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current["device_id"],
                payload.stock_item_id,
                payload.quantity,
                payload.price,
                payload.cost,
                payload.expense,
                payload.delivery_fee,
                payload.staff,
                payload.sale_date or now[:10],
                payload.memo,
                now,
                now,
            ),
        )
        sale_id = cursor.lastrowid
        stock_item = _adjust_stock(db, payload.stock_item_id, -payload.quantity)
        sale = row_to_dict(db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone())

    if stock_item and stock_item["alert_flag"]:
        await manager.broadcast({"type": "stock_alert", "item": stock_item})

    await manager.broadcast({"type": "sale_created", "sale": sale})
    return {"sale": sale, "stock": stock_item}


@router.patch("/sales/{sale_id}")
async def update_sale(sale_id: int, payload: SaleCreate, current: Annotated[dict, Depends(get_current_device)]):
    now = utc_now_iso()
    with get_db() as db:
        existing = db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Sale not found")

        _adjust_stock(db, existing["stock_item_id"], existing["quantity"])
        db.execute(
            """
            UPDATE sales
            SET stock_item_id = ?, quantity = ?, price = ?, cost = ?, expense = ?,
                delivery_fee = ?, staff = ?, sale_date = ?, memo = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.stock_item_id,
                payload.quantity,
                payload.price,
                payload.cost,
                payload.expense,
                payload.delivery_fee,
                payload.staff,
                payload.sale_date or existing["sale_date"] or now[:10],
                payload.memo,
                now,
                sale_id,
            ),
        )
        stock_item = _adjust_stock(db, payload.stock_item_id, -payload.quantity)
        sale = row_to_dict(db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone())

    if stock_item and stock_item["alert_flag"]:
        await manager.broadcast({"type": "stock_alert", "item": stock_item})
    await manager.broadcast({"type": "sale_updated", "sale": sale})
    return {"sale": sale, "stock": stock_item}


@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: int, current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        existing = db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Sale not found")
        stock_item = _adjust_stock(db, existing["stock_item_id"], existing["quantity"])
        db.execute("DELETE FROM sales WHERE id = ?", (sale_id,))

    await manager.broadcast({"type": "sale_deleted", "sale_id": sale_id, "stock": stock_item})
    return {"ok": True, "stock": stock_item}


@router.get("/sales")
def list_sales(
    current: Annotated[dict, Depends(get_current_device)],
    month: str | None = Query(default=None),
):
    where = ""
    params: list[str] = []
    if month:
        where = "WHERE substr(COALESCE(sale_date, created_at), 1, 7) = ?"
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
