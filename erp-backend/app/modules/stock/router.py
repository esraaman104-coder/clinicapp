from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import StockResponse, StockMovementResponse, StockAdjustment

router = APIRouter(prefix="/stock", tags=["stock"])

@router.get("/", response_model=List[StockResponse])
async def list_stock(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = None,
    branch_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        sql_query = """
            SELECT s.*, p.name as product_name, p.sale_price, p.sku, p.unit, p.min_stock, 
                   b.name as branch_name, w.name as warehouse_name, c.name as category_name
            FROM stock s
            JOIN products p ON s.product_id = p.id
            JOIN branches b ON s.branch_id = b.id
            LEFT JOIN warehouses w ON s.warehouse_id = w.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        """
        params = []
        
        # Branch isolation
        if current_user["role"] != "admin":
            sql_query += " AND s.branch_id = $1"
            params.append(current_user["branch_id"])
        elif branch_id:
            sql_query += " AND s.branch_id = $1"
            params.append(branch_id)
            
        if warehouse_id:
            p_idx = len(params) + 1
            sql_query += f" AND s.warehouse_id = ${p_idx}"
            params.append(warehouse_id)

        if search:
            p_idx = len(params) + 1
            sql_query += f" AND (p.name ILIKE ${p_idx} OR p.sku ILIKE ${p_idx})"
            params.append(f"%{search}%")
            
        sql_query += f" ORDER BY s.updated_at DESC LIMIT ${len(params)+1} OFFSET ${len(params)+2}"
        params.extend([limit, offset])
            
        rows = await conn.fetch(sql_query, *params)
        return [dict(row) for row in rows]

@router.post("/adjust")
async def adjust_stock(
    adjustment: StockAdjustment,
    current_user=Depends(check_role(["admin", "manager"]))
):
    async with db_connection() as conn:
        async with conn.transaction():
            # 1. Fetch current stock
            stock_row = await conn.fetchrow(
                "SELECT * FROM stock WHERE product_id = $1 AND warehouse_id = $2 FOR UPDATE",
                adjustment.product_id, adjustment.warehouse_id
            )
            
            if not stock_row:
                raise HTTPException(status_code=404, detail="Stock record not found for this product/warehouse")
            
            # Branch isolation check for manager
            if current_user["role"] == "manager" and stock_row["branch_id"] != current_user["branch_id"]:
                raise HTTPException(status_code=403, detail="Manager can only adjust stock in their branch")
            
            qty_before = stock_row["quantity"]
            qty_after = adjustment.new_quantity
            qty_change = qty_after - qty_before
            
            # 2. Update stock
            await conn.execute(
                "UPDATE stock SET quantity = $1, updated_at = NOW() WHERE id = $2",
                qty_after, stock_row["id"]
            )
            
            # 3. Record movement
            await conn.execute(
                """INSERT INTO stock_movements 
                   (product_id, branch_id, warehouse_id, type, qty_change, qty_before, qty_after, reference_type, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                adjustment.product_id, stock_row["branch_id"], adjustment.warehouse_id, 
                "adjustment", qty_change, qty_before, qty_after, "manual", current_user["id"]
            )
            
            # 4. RULE-003: Audit Log
            await conn.execute(
                """INSERT INTO logs (user_id, branch_id, module, action, timestamp, entity_type, entity_id, new_value)
                   VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)""",
                current_user["id"], stock_row["branch_id"], "stock", "adjustment", 
                "stock", stock_row["id"], {"qty_before": qty_before, "qty_after": qty_after, "reason": adjustment.reason}
            )
            
            return {"message": "Stock adjusted successfully", "qty_before": qty_before, "qty_after": qty_after}

@router.get("/low-stock", response_model=List[StockResponse])
async def list_low_stock(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT s.*, p.name as product_name, p.sale_price, p.sku, p.unit, p.min_stock, 
                   b.name as branch_name, w.name as warehouse_name, c.name as category_name
            FROM stock s
            JOIN products p ON s.product_id = p.id
            JOIN branches b ON s.branch_id = b.id
            LEFT JOIN warehouses w ON s.warehouse_id = w.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.quantity <= p.min_stock
        """
        params = []
        if current_user["role"] != "admin":
            query += " AND s.branch_id = $1"
            params.append(current_user["branch_id"])
            
        query += f" LIMIT ${len(params)+1} OFFSET ${len(params)+2}"
        params.extend([limit, offset])
            
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.get("/movements", response_model=List[StockMovementResponse])
async def list_movements(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    product_id: Optional[UUID] = None,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT sm.*, p.name as product_name, u.name as created_by_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE 1=1
        """
        params = []
        if current_user["role"] != "admin":
            query += " AND sm.branch_id = $1"
            params.append(current_user["branch_id"])
            
        if product_id:
            p_idx = len(params) + 1
            query += f" AND sm.product_id = ${p_idx}"
            params.append(product_id)
            
        query += f" ORDER BY sm.created_at DESC LIMIT ${len(params)+1} OFFSET ${len(params)+2}"
        params.extend([limit, offset])
            
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]
