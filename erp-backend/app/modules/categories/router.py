from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
import json
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import CategoryResponse, CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[CategoryResponse])
async def list_categories(current_user=Depends(get_current_user)):
    async with db_connection() as conn:
        rows = await conn.fetch("SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC")
        return [dict(r) for r in rows]

@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user=Depends(check_role(["admin"]))
):
    async with db_connection() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """INSERT INTO categories (name, color, description, is_active)
                   VALUES ($1, $2, $3, $4) RETURNING *""",
                category.name, category.color, category.description, category.is_active
            )
            
            # RULE-003: Audit Log
            await conn.execute(
                """INSERT INTO logs (user_id, module, action, new_value, timestamp)
                   VALUES ($1, 'categories', 'create', $2::jsonb, NOW())""",
                current_user["id"],
                json.dumps({"name": category.name}, ensure_ascii=False)
            )
            return dict(row)

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category: CategoryUpdate,
    current_user=Depends(check_role(["admin"]))
):
    async with db_connection() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """UPDATE categories 
                   SET name = $1, color = $2, description = $3, is_active = $4, updated_at = NOW()
                   WHERE id = $5 RETURNING *""",
                category.name, category.color, category.description, category.is_active,
                category_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Category not found")
            
            # RULE-003: Audit Log
            await conn.execute(
                """INSERT INTO logs (user_id, module, action, new_value, timestamp)
                   VALUES ($1, 'categories', 'update', $2::jsonb, NOW())""",
                current_user["id"],
                json.dumps({"id": str(category_id), "name": category.name}, ensure_ascii=False)
            )
            return dict(row)

@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    current_user=Depends(check_role(["admin"]))
):
    async with db_connection() as conn:
        async with conn.transaction():
            # RULE-007: Soft delete
            result = await conn.execute(
                "UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
                category_id
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Category not found")
            
            # RULE-003: Audit Log
            await conn.execute(
                """INSERT INTO logs (user_id, module, action, new_value, timestamp)
                   VALUES ($1, 'categories', 'delete', $2::jsonb, NOW())""",
                current_user["id"],
                json.dumps({"id": str(category_id), "is_active": False}, ensure_ascii=False)
            )
            return {"message": "Category deleted (soft delete)"}
