from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth import get_current_device
from backend.database import get_db, row_to_dict, rows_to_dicts, utc_now_iso


router = APIRouter(prefix="/api/kpi", tags=["kpi"])


class InvestmentCreate(BaseModel):
    investor: str
    amount: float = Field(gt=0)
    memo: str | None = None
    created_at: str | None = None


def _device_key(device_id: str) -> str:
    return "A" if device_id == "device_a" else "B"


def _build_kpi(
    current: dict,
    month: str | None = Query(default=None),
    commission_pool: float = Query(default=0, ge=0),
    role_reward_a: float = Query(default=0, ge=0),
    role_reward_b: float = Query(default=0, ge=0),
    delivery_fee_a: float = Query(default=0, ge=0),
    delivery_fee_b: float = Query(default=0, ge=0),
) -> dict:
    where = ""
    params: list[str] = []
    if month:
        where = "WHERE substr(created_at, 1, 7) = ?"
        params.append(month)

    with get_db() as db:
        sales_rows = db.execute(f"SELECT * FROM sales {where}", params).fetchall()
        expense_rows = db.execute(f"SELECT * FROM expenses {where}", params).fetchall()
        investment_rows = db.execute("SELECT * FROM investments").fetchall()

    total_sales_count = len(sales_rows)
    sales_count = {"A": 0, "B": 0}
    revenue = gross = 0.0
    delivery = {"A": 0.0, "B": 0.0}
    for row in sales_rows:
        key = _device_key(row["device_id"])
        sales_count[key] += row["quantity"]
        revenue += row["price"]
        gross += row["price"] - row["cost"] - row["expense"]
        delivery[key] += row.get("delivery_fee", 0) or 0

    total_units = sales_count["A"] + sales_count["B"]
    operation_ratio_a = sales_count["A"] / total_units if total_units else 0.5
    operation_ratio_b = 1 - operation_ratio_a

    investment = {"A": 0.0, "B": 0.0}
    for row in investment_rows:
        investor = row["investor"]
        if investor in investment:
            investment[investor] += row["amount"]

    total_investment = investment["A"] + investment["B"]
    investment_ratio_a = investment["A"] / total_investment if total_investment else 0.5
    investment_ratio_b = 1 - investment_ratio_a

    blend_a = operation_ratio_a * 0.4 + investment_ratio_a * 0.6
    blend_b = operation_ratio_b * 0.4 + investment_ratio_b * 0.6
    commission_a = commission_pool * blend_a
    commission_b = commission_pool * blend_b
    take_home_a = commission_a + role_reward_a + delivery_fee_a + delivery["A"]
    take_home_b = commission_b + role_reward_b + delivery_fee_b + delivery["B"]

    return {
        "month": month,
        "sales_count": total_sales_count,
        "unit_count": sales_count,
        "revenue": revenue,
        "gross": gross,
        "expenses": sum(row["amount"] for row in expense_rows),
        "investment": investment,
        "ratios": {
            "operation": {"A": operation_ratio_a, "B": operation_ratio_b},
            "investment": {"A": investment_ratio_a, "B": investment_ratio_b},
            "blend": {"A": blend_a, "B": blend_b},
        },
        "commission": {"A": commission_a, "B": commission_b, "pool": commission_pool},
        "delivery": delivery,
        "take_home": {"A": take_home_a, "B": take_home_b},
    }


@router.get("/actual")
def get_actual_kpi(
    current: Annotated[dict, Depends(get_current_device)],
    month: str | None = Query(default=None),
    commission_pool: float = Query(default=0, ge=0),
    role_reward_a: float = Query(default=0, ge=0),
    role_reward_b: float = Query(default=0, ge=0),
    delivery_fee_a: float = Query(default=0, ge=0),
    delivery_fee_b: float = Query(default=0, ge=0),
):
    return _build_kpi(current, month, commission_pool, role_reward_a, role_reward_b, delivery_fee_a, delivery_fee_b)


@router.get("/summary")
def get_kpi_summary(
    current: Annotated[dict, Depends(get_current_device)],
    month: str | None = Query(default=None),
    commission_pool: float = Query(default=0, ge=0),
):
    return _build_kpi(current, month, commission_pool)


@router.get("/investments")
def list_investments(current: Annotated[dict, Depends(get_current_device)]):
    with get_db() as db:
        rows = rows_to_dicts(db.execute("SELECT * FROM investments ORDER BY created_at DESC").fetchall())
    return {"items": rows}


@router.post("/investments")
def create_investment(payload: InvestmentCreate, current: Annotated[dict, Depends(get_current_device)]):
    if payload.investor not in {"A", "B"}:
        raise HTTPException(status_code=400, detail="Investor must be A or B")

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO investments (investor, amount, memo, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (payload.investor, payload.amount, payload.memo, payload.created_at or utc_now_iso()),
        )
        item = row_to_dict(db.execute("SELECT * FROM investments WHERE id = ?", (cursor.lastrowid,)).fetchone())
    return {"item": item}
