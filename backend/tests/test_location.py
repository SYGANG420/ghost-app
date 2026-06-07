from datetime import datetime, timedelta, timezone

from backend.database import get_db, utc_now_iso
from backend.database import mark_stale_devices_offline


def test_heartbeat_can_be_registered(client, auth_a):
    response = client.post(
        "/api/heartbeat",
        json={"device_id": "device_a", "lat": 35.0, "lon": 139.0, "timestamp": utc_now_iso(), "battery": 88},
        headers=auth_a,
    )
    assert response.status_code == 200
    assert response.json()["location"]["online"] == 1


def test_device_goes_offline_after_two_minutes(client, auth_a):
    old = (datetime.now(timezone.utc) - timedelta(seconds=130)).isoformat()
    client.post("/api/heartbeat", json={"device_id": "device_a", "lat": 35, "lon": 139, "timestamp": old}, headers=auth_a)
    import asyncio
    asyncio.run(mark_stale_devices_offline())
    with get_db() as db:
        row = db.execute("SELECT online FROM locations WHERE device_id = ?", ("device_a",)).fetchone()
    assert row["online"] == 0


def test_both_device_locations_can_be_read(client, auth_a, auth_b):
    client.post("/api/heartbeat", json={"device_id": "device_a", "lat": 35, "lon": 139}, headers=auth_a)
    client.post("/api/heartbeat", json={"device_id": "device_b", "lat": 36, "lon": 140}, headers=auth_b)
    response = client.get("/api/location", headers=auth_a)
    assert response.status_code == 200
    assert {item["device_id"] for item in response.json()["items"]} == {"device_a", "device_b"}
