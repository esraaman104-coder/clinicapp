import pytest
from app.auth.service import create_refresh_token

@pytest.mark.asyncio
async def test_login_success(async_client, db_conn, admin_user):
    """Test successful login with correct credentials."""
    # Mock user fetch from database
    db_conn.fetchrow.return_value = admin_user
    
    response = await async_client.post("/api/auth/login", json={
        "email": admin_user["email"],
        "password": "password123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    db_conn.fetchrow.assert_called_once()

@pytest.mark.asyncio
async def test_login_wrong_password(async_client, db_conn, admin_user):
    """Test login failure with incorrect password."""
    # Mock user fetch
    db_conn.fetchrow.return_value = admin_user
    
    response = await async_client.post("/api/auth/login", json={
        "email": admin_user["email"],
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_login_inactive_user(async_client, db_conn, admin_user):
    """Test login failure for inactive user (or user not found)."""
    # The query filters for is_active = TRUE, so we return None to simulate inactive/not found
    db_conn.fetchrow.return_value = None
    
    response = await async_client.post("/api/auth/login", json={
        "email": admin_user["email"],
        "password": "password123"
    })
    
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_refresh_token(async_client, db_conn, admin_user):
    """Test token refresh mechanism."""
    # Create a valid refresh token manually
    payload = {
        "sub": str(admin_user["id"]), 
        "role": admin_user["role"], 
        "branch_id": str(admin_user["branch_id"])
    }
    refresh_token = create_refresh_token(payload)
    
    # Mock blacklist check (returns None for not found) and user fetch
    db_conn.fetchval.return_value = None
    db_conn.fetchrow.return_value = admin_user
    
    response = await async_client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_get_me(async_client, db_conn, admin_user, auth_headers):
    """Test fetching current user profile profile."""
    # Mock user fetch for get_current_user dependency
    db_conn.fetchrow.return_value = admin_user
    
    response = await async_client.get("/api/auth/me", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_user["email"]
    assert data["role"] == admin_user["role"]
    assert data["id"] == str(admin_user["id"])
