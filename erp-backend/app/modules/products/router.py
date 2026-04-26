from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
import json
import logging
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import ProductCreate, ProductResponse

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/", response_model=List[ProductResponse])
async def list_products(
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT p.*, c.name as category_name, c.color as category_color 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_active = TRUE
        """
        params = []
        
        if search:
            params.append(f"%{search}%")
            query += f" AND (p.name ILIKE ${len(params)} OR p.sku ILIKE ${len(params)})"
            
        if category_id:
            params.append(category_id)
            query += f" AND p.category_id = ${len(params)}"
            
        query += f" ORDER BY p.created_at DESC LIMIT ${len(params)+1} OFFSET ${len(params)+2}"
        params.extend([limit, offset])
        
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.get("/search", response_model=List[ProductResponse])
async def search_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT p.*, c.name as category_name, c.color as category_color 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_active = TRUE AND (p.name ILIKE $1 OR p.sku ILIKE $1)
            LIMIT $2
        """
        rows = await conn.fetch(query, f"%{q}%", limit)
        return [dict(row) for row in rows]

@router.post("/", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user=Depends(check_role(["admin", "manager"])),
):
    async with db_connection() as conn:
        try:
            row = await conn.fetchrow(
                """INSERT INTO products (name, sku, unit, cost_price, sale_price, category_id, min_stock, is_active) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *""",
                product.name, product.sku, product.unit, product.cost_price, 
                product.sale_price, product.category_id, product.min_stock, product.is_active
            )
            # Log the action
            await conn.execute(
                """INSERT INTO logs (user_id, action, module, entity_type, entity_id, new_value)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                current_user["id"], "CREATE", "products", "products", row["id"], json.dumps(dict(row), default=str)
            )
            
            # Fetch with category details to return
            full_row = await conn.fetchrow(
                """SELECT p.*, c.name as category_name, c.color as category_color 
                   FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1""",
                row["id"]
            )
            return dict(full_row)
        except Exception as e:
            if "products_sku_key" in str(e):
                raise HTTPException(status_code=400, detail="Product with this SKU already exists")
            logging.error(f"[products] {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product: ProductCreate,
    current_user=Depends(check_role(["admin", "manager"])),
):
    async with db_connection() as conn:
        old_row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not old_row:
            raise HTTPException(status_code=404, detail="Product not found")
            
        try:
            new_row = await conn.fetchrow(
                """UPDATE products SET name=$1, sku=$2, unit=$3, cost_price=$4, sale_price=$5, 
                   category_id=$6, min_stock=$7, is_active=$8, updated_at=NOW() 
                   WHERE id=$9 RETURNING *""",
                product.name, product.sku, product.unit, product.cost_price, 
                product.sale_price, product.category_id, product.min_stock, product.is_active, product_id
            )
            # Log the action
            await conn.execute(
                """INSERT INTO logs (user_id, action, module, entity_type, entity_id, old_value, new_value)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                current_user["id"], "UPDATE", "products", "products", product_id, 
                json.dumps(dict(old_row), default=str), json.dumps(dict(new_row), default=str)
            )
            
            # Fetch with category details
            full_row = await conn.fetchrow(
                """SELECT p.*, c.name as category_name, c.color as category_color 
                   FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1""",
                product_id
            )
            return dict(full_row)
        except Exception as e:
            if "products_sku_key" in str(e):
                raise HTTPException(status_code=400, detail="Product with this SKU already exists")
            logging.error(f"[products] {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.delete("/{product_id}")
async def delete_product(
    product_id: UUID,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        old_row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not old_row:
            raise HTTPException(status_code=404, detail="Product not found")
            
        # Soft delete
        new_row = await conn.fetchrow(
            "UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1 RETURNING *", 
            product_id
        )
        
        # Log the action
        await conn.execute(
            """INSERT INTO logs (user_id, action, module, entity_type, entity_id, old_value, new_value)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            current_user["id"], "DELETE", "products", "products", product_id, 
            json.dumps(dict(old_row), default=str), json.dumps(dict(new_row), default=str)
        )
        return {"detail": "Product deleted successfully"}
