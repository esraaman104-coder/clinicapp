import pytest
from uuid import uuid4
from datetime import datetime

@pytest.mark.asyncio
async def test_list_products_unauthorized(async_client):
    """Test that listing products without token returns 401."""
    response = await async_client.get("/api/products/")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_search_products_unauthorized(async_client):
    """Test that searching products without token returns 401."""
    response = await async_client.get("/api/products/search?q=test")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_create_product_unauthorized(async_client):
    """Test that creating product without token returns 401."""
    response = await async_client.post("/api/products/", json={
        "name": "Test Product",
        "unit": "kg",
        "cost_price": 10.0,
        "sale_price": 15.0
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_create_product_as_admin(async_client, db_conn, admin_user, auth_headers):
    """Test that admin can successfully create a product."""
    category_id = str(uuid4())
    product_id = uuid4()
    
    # Mock database flow: 
    # 1. get_current_user (fetchrow)
    # 2. INSERT product (fetchrow)
    # 3. Log action (execute)
    # 4. Fetch full row with category (fetchrow)
    now = datetime.now()
    db_conn.fetchrow.side_effect = [
        admin_user, 
        {"id": product_id}, 
        {
            "id": product_id, 
            "name": "Admin Product", 
            "sku": "SKU-ADMIN-1",
            "unit": "unit",
            "cost_price": 50.0,
            "sale_price": 100.0,
            "category_id": category_id,
            "category_name": "Test Cat",
            "category_color": "#000",
            "min_stock": 5.0,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    response = await async_client.post("/api/products/", json={
        "name": "Admin Product",
        "sku": "SKU-ADMIN-1",
        "unit": "unit",
        "cost_price": 50.0,
        "sale_price": 100.0,
        "category_id": category_id,
        "min_stock": 5,
        "is_active": True
    }, headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["name"] == "Admin Product"
    assert db_conn.fetchrow.call_count >= 2

@pytest.mark.asyncio
async def test_create_product_as_cashier(async_client, db_conn, cashier_user, cashier_headers):
    """Test that cashier is forbidden from creating a product (RBAC check)."""
    # Mock user fetch for auth
    db_conn.fetchrow.return_value = cashier_user
    
    response = await async_client.post("/api/products/", json={
        "name": "Cashier Product",
        "sku": "SKU-CASHIER-1",
        "unit": "unit",
        "cost_price": 50.0,
        "sale_price": 100.0,
        "category_id": str(uuid4()),
        "min_stock": 5,
        "is_active": True
    }, headers=cashier_headers)
    
    # check_role(["admin", "manager"]) should fail for "cashier"
    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"

@pytest.mark.asyncio
async def test_update_product_unauthorized(async_client):
    """Test that updating product without token returns 401."""
    response = await async_client.put(f"/api/products/{uuid4()}", json={
        "name": "Updated Product",
        "unit": "kg",
        "cost_price": 10.0,
        "sale_price": 15.0
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_delete_product_unauthorized(async_client):
    """Test that deleting product without token returns 401."""
    response = await async_client.delete(f"/api/products/{uuid4()}")
    assert response.status_code == 401
