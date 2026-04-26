from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = "SELECT * FROM customers WHERE is_active = TRUE"
        params = []
        
        # Branch isolation
        if current_user["role"] != "admin":
            query += " AND branch_id = $1"
            params.append(current_user["branch_id"])
        
        if search:
            p_idx = len(params) + 1
            query += f" AND (name ILIKE ${p_idx} OR phone ILIKE ${p_idx})"
            params.append(f"%{search}%")
            
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        branch_id = customer.branch_id or current_user["branch_id"]
        row = await conn.fetchrow(
            """INSERT INTO customers (name, phone, address, balance, credit_limit, branch_id, is_active) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            customer.name, customer.phone, customer.address, customer.balance, 
            customer.credit_limit, branch_id, customer.is_active
        )
        return dict(row)

@router.get("/{customer_id}/statement")
async def get_customer_statement(
    customer_id: UUID,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        # Get invoices
        invoices = await conn.fetch(
            "SELECT id, invoice_number as ref, total as amount, 'invoice' as type, created_at FROM invoices WHERE customer_id = $1",
            customer_id
        )
        # Get payments
        payments = await conn.fetch(
            "SELECT id, 'PAY-' || id::text as ref, amount, 'payment' as type, created_at FROM payments WHERE entity_type = 'customer' AND entity_id = $1",
            customer_id
        )
        
        statement = [dict(i) for i in invoices] + [dict(p) for p in payments]
        statement.sort(key=lambda x: x["created_at"], reverse=True)
        return statement
