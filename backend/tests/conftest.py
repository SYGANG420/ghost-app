import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
TEST_DIR = Path(tempfile.mkdtemp(prefix="ghost-control-tests-"))
os.environ["GHOST_DB_PATH"] = str(TEST_DIR / "ghost-test.db")
os.environ["GHOST_DB_KEY"] = "test-db-key"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_SECRET"] = "test-jwt-secret"

from backend import main  # noqa: E402
from backend import database  # noqa: E402
from backend.routers import wipe  # noqa: E402


@pytest.fixture(autouse=True)
def reset_test_state():
    database.DB_PATH.unlink(missing_ok=True)
    database.init_db()
    main.rate_buckets.clear()
    wipe.WIPE_AUDIT_LOG = TEST_DIR / "wipe_audit.log"
    wipe.WIPE_AUDIT_LOG.unlink(missing_ok=True)
    yield


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def token_a(client):
    response = client.post("/api/auth/device", json={"device_id": "device_a"})
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def token_b(client):
    response = client.post("/api/auth/device", json={"device_id": "device_b"})
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def auth_a(token_a):
    return {"Authorization": f"Bearer {token_a}"}


@pytest.fixture
def auth_b(token_b):
    return {"Authorization": f"Bearer {token_b}"}


@pytest.fixture
def stock_item(client, auth_a):
    response = client.post(
        "/api/stock/item",
        json={
            "name": "商品A",
            "quantity": 10,
            "threshold": 3,
            "purchase_price": 1000,
            "retail_price": 1800,
        },
        headers=auth_a,
    )
    assert response.status_code == 200
    return response.json()["item"]
