def test_sql_injection_device_id_is_blocked(client):
    response = client.post("/api/auth/device", json={"device_id": "device_a OR 1=1--"})
    assert response.status_code == 422


def test_huge_payload_returns_413(client, auth_a):
    response = client.post("/api/sales", content=b"A" * 1_100_000, headers={**auth_a, "Content-Type": "application/octet-stream"})
    assert response.status_code == 413


def test_cors_rejects_evil_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "https://evil.com", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_rate_limit_is_enforced(client):
    statuses = [client.get("/api/health").status_code for _ in range(121)]
    assert statuses[-1] == 429


def test_idor_wipe_status_is_blocked(client, auth_b):
    response = client.get("/api/wipe/device_a/status", headers=auth_b)
    assert response.status_code == 403
