import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from datetime import datetime

# IMPORTANT: Mock db_connection BEFORE importing app to avoid asyncpg initialization issues
mock_conn = AsyncMock()
mock_conn.transaction = MagicMock() # Should be MagicMock as it returns a context manager, not a coroutine

@asynccontextmanager
async def mock_db_context():
    yield mock_conn

# Patching the database connection globally for tests
patcher = patch("app.database.db_connection", side_effect=mock_db_context)
patcher.start()

# Now we can safely import app
from app.main import app
from app.auth.service import create_access_token, get_password_hash
from httpx import AsyncClient, ASGITransport
import uuid

@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset the global mock connection before each test."""
    mock_conn.reset_mock()
    mock_conn.fetchrow.side_effect = None
    mock_conn.fetchrow.return_value = None
    mock_conn.fetchval.side_effect = None
    mock_conn.fetchval.return_value = None
    mock_conn.execute.side_effect = None
    mock_conn.execute.return_value = "DONE"
    mock_conn.fetch.side_effect = None
    mock_conn.fetch.return_value = []
    return mock_conn

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def async_client():
    """Fixture for the async test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def db_conn():
    """Fixture to access the mocked database connection."""
    return mock_conn

@pytest.fixture
def admin_user():
    """Fixture for an admin user object."""
    user_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    return {
        "id": user_id,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "branch_id": branch_id,
        "password_hash": get_password_hash("password123"),
        "is_active": True,
        "created_at": datetime.now()
    }

@pytest.fixture
def cashier_user():
    """Fixture for a cashier user object."""
    user_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    return {
        "id": user_id,
        "name": "Cashier User",
        "email": "cashier@example.com",
        "role": "cashier",
        "branch_id": branch_id,
        "password_hash": get_password_hash("password123"),
        "is_active": True,
        "created_at": datetime.now()
    }

@pytest.fixture
def admin_token(admin_user):
    """Fixture for an admin JWT token."""
    payload = {
        "sub": str(admin_user["id"]),
        "role": admin_user["role"],
        "branch_id": str(admin_user["branch_id"])
    }
    return create_access_token(payload)

@pytest.fixture
def cashier_token(cashier_user):
    """Fixture for a cashier JWT token."""
    payload = {
        "sub": str(cashier_user["id"]),
        "role": cashier_user["role"],
        "branch_id": str(cashier_user["branch_id"])
    }
    return create_access_token(payload)

@pytest.fixture
def auth_headers(admin_token):
    """Headers for admin authentication."""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def cashier_headers(cashier_token):
    """Headers for cashier authentication."""
    return {"Authorization": f"Bearer {cashier_token}"}
