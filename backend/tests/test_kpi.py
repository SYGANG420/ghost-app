def seed_kpi_data(client, auth_a, auth_b):
    item = client.post(
        "/api/stock/item",
        json={"name": "KPI商品", "quantity": 20, "threshold": 3, "purchase_price": 1000, "retail_price": 2000},
        headers=auth_a,
    ).json()["item"]
    client.post("/api/sales", json={"stock_item_id": item["id"], "quantity": 3, "price": 6000, "cost": 3000, "sale_date": "2026-06-01"}, headers=auth_a)
    client.post("/api/sales", json={"stock_item_id": item["id"], "quantity": 1, "price": 2000, "cost": 1000, "sale_date": "2026-06-02"}, headers=auth_b)
    client.post("/api/kpi/investments", json={"investor": "A", "amount": 6000, "created_at": "2026-06-01"}, headers=auth_a)
    client.post("/api/kpi/investments", json={"investor": "B", "amount": 4000, "created_at": "2026-06-01"}, headers=auth_a)


def test_actual_kpi_is_correct(client, auth_a, auth_b):
    seed_kpi_data(client, auth_a, auth_b)
    response = client.get("/api/kpi/actual?month=2026-06&commission_pool=4000", headers=auth_a)
    assert response.status_code == 200
    assert response.json()["revenue"] == 8000
    assert response.json()["gross"] == 4000


def test_blend_ratio_is_correct(client, auth_a, auth_b):
    seed_kpi_data(client, auth_a, auth_b)
    ratios = client.get("/api/kpi/actual?month=2026-06", headers=auth_a).json()["ratios"]
    assert round(ratios["operation"]["A"], 2) == 0.75
    assert round(ratios["investment"]["A"], 2) == 0.60
    assert round(ratios["blend"]["A"], 2) == 0.66


def test_commission_calculation_is_correct(client, auth_a, auth_b):
    seed_kpi_data(client, auth_a, auth_b)
    data = client.get("/api/kpi/actual?month=2026-06&commission_pool=4000", headers=auth_a).json()
    assert round(data["commission"]["A"]) == 2640
    assert round(data["commission"]["B"]) == 1360


def test_investment_history_can_be_created(client, auth_a):
    response = client.post("/api/kpi/investments", json={"investor": "A", "amount": 1234, "memo": "seed"}, headers=auth_a)
    assert response.status_code == 200
    assert response.json()["item"]["amount"] == 1234


def test_investment_ratio_is_correct(client, auth_a):
    client.post("/api/kpi/investments", json={"investor": "A", "amount": 300}, headers=auth_a)
    client.post("/api/kpi/investments", json={"investor": "B", "amount": 100}, headers=auth_a)
    data = client.get("/api/kpi/actual", headers=auth_a).json()
    assert data["ratios"]["investment"]["A"] == 0.75
