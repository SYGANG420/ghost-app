def test_stock_item_can_be_created(client, auth_a):
    response = client.post(
        "/api/stock/item",
        json={"name": "商品B", "quantity": 5, "threshold": 2, "purchase_price": 500, "retail_price": 900},
        headers=auth_a,
    )
    assert response.status_code == 200
    assert response.json()["item"]["name"] == "商品B"


def test_stock_list_can_be_read(client, auth_a, stock_item):
    response = client.get("/api/stock", headers=auth_a)
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == stock_item["id"]


def test_stock_can_be_restocked(client, auth_a, stock_item):
    response = client.post("/api/stock/restock", json={"stock_item_id": stock_item["id"], "quantity": 5}, headers=auth_a)
    assert response.status_code == 200
    assert response.json()["item"]["quantity"] == 15


def test_threshold_sets_alert_flag(client, auth_a):
    response = client.post(
        "/api/stock/item",
        json={"name": "少量商品", "quantity": 2, "threshold": 3, "purchase_price": 100, "retail_price": 200},
        headers=auth_a,
    )
    assert response.status_code == 200
    assert response.json()["item"]["alert_flag"] == 1


def test_stock_item_can_be_deleted(client, auth_a, stock_item):
    response = client.delete(f"/api/stock/{stock_item['id']}", headers=auth_a)
    assert response.status_code == 200
    listed = client.get("/api/stock", headers=auth_a).json()["items"]
    assert listed == []


def test_device_b_can_read_stock(client, auth_b, stock_item):
    response = client.get("/api/stock", headers=auth_b)
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
