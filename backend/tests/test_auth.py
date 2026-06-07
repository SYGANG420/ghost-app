import base64
import json


def b64url(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def test_device_a_can_get_jwt(client):
    response = client.post("/api/auth/device", json={"device_id": "device_a"})
    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"
    assert response.json()["token"]


def test_device_b_can_get_jwt(client):
    response = client.post("/api/auth/device", json={"device_id": "device_b"})
    assert response.status_code == 200
    assert response.json()["role"] == "USER"


def test_invalid_device_id_is_rejected(client):
    response = client.post("/api/auth/device", json={"device_id": "device_x"})
    assert response.status_code == 422


def test_tampered_jwt_is_rejected(client, token_a):
    response = client.get("/api/stock", headers={"Authorization": f"Bearer {token_a}x"})
    assert response.status_code == 401


def test_missing_jwt_returns_401(client):
    response = client.get("/api/stock")
    assert response.status_code == 401


def test_none_algorithm_jwt_is_rejected(client):
    token = f"{b64url({'alg': 'none', 'typ': 'JWT'})}.{b64url({'sub': 'device_a', 'role': 'ADMIN'})}."
    response = client.get("/api/stock", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
