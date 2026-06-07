def create_sale(client, headers, stock_item, quantity=2, price=3600, cost=2000, month="2026-06"):
    return client.post(
        "/api/sales",
        json={
            "stock_item_id": stock_item["id"],
            "quantity": quantity,
            "price": price,
            "cost": cost,
            "expense": 100,
            "delivery_fee": 500,
            "staff": "A",
            "sale_date": f"{month}-07",
            "memo": "test sale",
        },
        headers=headers,
    )


def test_sale_can_be_created(client, auth_a, stock_item):
    response = create_sale(client, auth_a, stock_item)
    assert response.status_code == 200
    assert response.json()["sale"]["price"] == 3600


def test_stock_is_decremented_after_sale(client, auth_a, stock_item):
    response = create_sale(client, auth_a, stock_item, quantity=3)
    assert response.status_code == 200
    assert response.json()["stock"]["quantity"] == 7


def test_low_stock_alert_is_set(client, auth_a, stock_item):
    response = create_sale(client, auth_a, stock_item, quantity=8)
    assert response.status_code == 200
    assert response.json()["stock"]["alert_flag"] == 1


def test_device_b_can_create_sale(client, auth_b, stock_item):
    response = create_sale(client, auth_b, stock_item)
    assert response.status_code == 200
    assert response.json()["sale"]["device_id"] == "device_b"


def test_sales_list_can_be_read(client, auth_a, stock_item):
    create_sale(client, auth_a, stock_item)
    response = client.get("/api/sales", headers=auth_a)
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_monthly_summary_is_correct(client, auth_a, stock_item):
    create_sale(client, auth_a, stock_item, price=3600, cost=2000, month="2026-06")
    create_sale(client, auth_a, stock_item, price=1800, cost=1000, month="2026-07")
    response = client.get("/api/sales?month=2026-06", headers=auth_a)
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert summary["count"] == 1
    assert summary["sales"] == 3600
    assert summary["gross"] == 1500


def test_expense_can_be_created(client, auth_a):
    response = client.post("/api/expenses", json={"amount": 1200, "category": "utility", "memo": "test"}, headers=auth_a)
    assert response.status_code == 200
    assert response.json()["expense"]["amount"] == 1200


def test_sale_can_be_deleted(client, auth_a, stock_item):
    created = create_sale(client, auth_a, stock_item, quantity=2).json()
    response = client.delete(f"/api/sales/{created['sale']['id']}", headers=auth_a)
    assert response.status_code == 200
    assert response.json()["stock"]["quantity"] == 10
