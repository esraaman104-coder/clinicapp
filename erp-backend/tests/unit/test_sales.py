import pytest
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime

@pytest.fixture
def mock_transaction(db_conn):
    """Fixture to mock database transactions."""
    tx = MagicMock()
    tx.__aenter__ = AsyncMock()
    tx.__aexit__ = AsyncMock(return_value=False) # CRITICAL: Return False to not suppress exceptions
    db_conn.transaction.return_value = tx
    return tx

@pytest.mark.asyncio
async def test_create_invoice_insufficient_stock(async_client, db_conn, admin_user, auth_headers, mock_transaction):
    """Test that creating an invoice fails if stock is insufficient."""
    product_id = uuid4()
    
    # Setup database mocks
    # 1. get_current_user (fetchrow)
    # 2. INSERT invoice (fetchrow)
    # 3. Check stock (fetchrow)
    db_conn.fetchrow.side_effect = [
        admin_user, 
        {"id": uuid4()},
        {"quantity": 5} # Only 5 in stock, but we'll request 10
    ]
    
    # 1. nextval (fetchval)
    # 2. Get product name for error (fetchval)
    db_conn.fetchval.side_effect = [
        1001, 
        "Laptop Pro"
    ]
    
    response = await async_client.post("/api/sales/invoice", json={
        "customer_id": str(uuid4()),
        "type": "cash",
        "subtotal": 1000,
        "discount": 0,
        "tax": 150,
        "total": 1150,
        "paid_amount": 1150,
        "items": [
            {
                "product_id": str(product_id),
                "warehouse_id": str(uuid4()),
                "qty": 10,
                "price": 100
            }
        ]
    }, headers=auth_headers)
    
    assert response.status_code == 400
    assert "Insufficient stock for Laptop Pro" in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_invoice_cash_success(async_client, db_conn, admin_user, auth_headers, mock_transaction):
    """Test successful cash invoice creation."""
    product_id = uuid4()
    invoice_id = uuid4()
    
    # Setup database mocks
    # fetchrow calls:
    # 1. get_current_user
    # 2. INSERT invoice
    # 3. Check stock
    # 4. INSERT item
    now = datetime.now()
    db_conn.fetchrow.side_effect = [
        admin_user,
        {"id": invoice_id, "invoice_number": "INV-20240101-000001", "total": 1150, "branch_id": admin_user["branch_id"], "customer_id": None, "type": "cash", "status": "completed", "subtotal": 1000, "discount": 0, "tax": 150, "paid_amount": 1150, "notes": None, "created_by": admin_user["id"], "created_at": now},
        {"quantity": 100},
        {"id": uuid4(), "invoice_id": invoice_id, "product_id": product_id, "qty": 10, "price": 100, "total": 1000, "warehouse_id": uuid4(), "product_name": "Laptop Pro"}
    ]
    
    # fetchval calls:
    # 1. nextval('invoice_seq')
    # 2. Get cost_price
    db_conn.fetchval.side_effect = [
        1, 
        75.0
    ]
    
    response = await async_client.post("/api/sales/invoice", json={
        "customer_id": None,
        "type": "cash",
        "subtotal": 1000,
        "discount": 0,
        "tax": 150,
        "total": 1150,
        "paid_amount": 1150,
        "items": [
            {
                "product_id": str(product_id),
                "warehouse_id": str(uuid4()),
                "qty": 10,
                "price": 100
            }
        ]
    }, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["invoice_number"].startswith("INV-")
    assert len(data["items"]) == 1
    assert data["total"] == 1150
    
    # Verify stock update was called
    from unittest.mock import ANY
    db_conn.execute.assert_any_call(
        "UPDATE stock SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
        90, product_id, ANY
    )
