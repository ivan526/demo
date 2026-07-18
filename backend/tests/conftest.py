import os
import sys
import tempfile
import pytest
from pathlib import Path

# Ensure backend root is on sys.path so `import main` works
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Strong secret key for tests; enable mock login so no WeChat API needed.
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-must-be-at-least-32-chars!")
os.environ.setdefault("MOCK_LOGIN", "true")


@pytest.fixture()
def client(monkeypatch):
    """Yield a FastAPI TestClient backed by a temp SQLite DB that is reset each test."""
    from fastapi.testclient import TestClient

    tmpdir = tempfile.mkdtemp(prefix="engtest_")
    db_path = os.path.join(tmpdir, "english_practice.db")
    monkeypatch.setenv("TEST_DB_PATH", db_path)

    # Import (or reload) main so DB_PATH picks up TEST_DB_PATH and init_db() runs
    import importlib
    import main as main_mod
    importlib.reload(main_mod)

    with TestClient(main_mod.app) as c:
        yield c, main_mod

    # cleanup
    try:
        os.unlink(db_path)
    except OSError:
        pass
    try:
        os.rmdir(tmpdir)
    except OSError:
        pass


def _login(client, code: str = "testcode"):
    """Helper: login via mock wx-login and return (token, openid)."""
    r = client.post(
        "/api/auth/wx-login",
        json={"code": code, "nickname": "tester", "avatar": ""},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0, body
    token = body["data"]["token"]
    openid = body["data"]["user_info"]["openid"]
    return token, openid


def _auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}
