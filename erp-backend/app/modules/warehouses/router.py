from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import WarehouseResponse, WarehouseCreate

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("/", response_model=List[WarehouseResponse])
async def list_warehouses(
    current_user=Depends(get_current_user),
):
    """
    List warehouses with branch isolation.
    Admin: يرى جميع المخازن.
    Manager/Cashier: يرى مخازن فرعه فقط.
    """
    async with db_connection() as conn:
        query = "SELECT * FROM warehouses WHERE is_active = TRUE"
        params = []

        if current_user["role"] != "admin":
            query += " AND branch_id = $1"
            params.append(current_user["branch_id"])

        query += " ORDER BY name ASC"
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]


@router.post("/", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse: WarehouseCreate,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """INSERT INTO warehouses (name, branch_id, location, is_active)
                   VALUES ($1, $2, $3, $4) RETURNING *""",
                warehouse.name, warehouse.branch_id,
                warehouse.location, warehouse.is_active,
            )
            # RULE-003: Audit Log
            import json
            await conn.execute(
                """INSERT INTO logs (user_id, branch_id, module, action, new_value)
                   VALUES ($1, $2, 'warehouses', 'create_warehouse', $3::jsonb)""",
                current_user["id"], warehouse.branch_id,
                json.dumps({"name": warehouse.name}, ensure_ascii=False),
            )
            return dict(row)
