from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from .schemas import SupplierCreate, SupplierResponse

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

@router.get("/", response_model=List[SupplierResponse])
async def list_suppliers(
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = "SELECT * FROM suppliers WHERE is_active = TRUE"
        params = []
        
        # Branch isolation (Suppliers can be global or branch-specific)
        if current_user["role"] != "admin":
            query += " AND (branch_id = $1 OR branch_id IS NULL)"
            params.append(current_user["branch_id"])
        
        if search:
            p_idx = len(params) + 1
            query += f" AND (name ILIKE ${p_idx} OR contact_name ILIKE ${p_idx})"
            params.append(f"%{search}%")
            
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    supplier: SupplierCreate,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        branch_id = supplier.branch_id or current_user["branch_id"]
        row = await conn.fetchrow(
            """INSERT INTO suppliers (name, contact_name, phone, email, address, balance, branch_id, is_active) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *""",
            supplier.name, supplier.contact_name, supplier.phone, supplier.email,
            supplier.address, supplier.balance, branch_id, supplier.is_active
        )
        return dict(row)
