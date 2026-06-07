from backend.routers import wipe


def test_device_b_cannot_request_wipe(client, auth_b):
    response = client.post("/api/wipe/device_a", json={"confirmation_token": "CONFIRM_WIPE"}, headers=auth_b)
    assert response.status_code == 403


def test_missing_confirmation_token_fails(client, auth_a):
    response = client.post("/api/wipe/device_a", json={"reason": "test"}, headers=auth_a)
    assert response.status_code == 400


def test_valid_confirmation_token_registers_wipe_command(client, auth_a):
    response = client.post("/api/wipe/device_b", json={"reason": "test", "confirmation_token": "CONFIRM_WIPE"}, headers=auth_a)
    assert response.status_code == 200
    assert response.json()["command"]["device_id"] == "device_b"


def test_wipe_audit_log_is_written(client, auth_a):
    client.post("/api/wipe/device_b", json={"reason": "audit", "confirmation_token": "CONFIRM_WIPE"}, headers=auth_a)
    assert wipe.WIPE_AUDIT_LOG.exists()
    assert "device_wipe" in wipe.WIPE_AUDIT_LOG.read_text(encoding="utf-8")


def test_admin_can_get_confirmation_token(client, auth_a):
    response = client.post("/api/wipe/confirm-token", json={"kind": "device"}, headers=auth_a)
    assert response.status_code == 200
    assert response.json()["confirmation_token"] == "CONFIRM_WIPE"
