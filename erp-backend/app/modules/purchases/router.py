from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
import logging
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import PurchaseCreate, PurchaseResponse, PurchaseItemResponse
from datetime import datetime

router = APIRouter(prefix="/purchases", tags=["purchases"])

@router.post("/", response_model=PurchaseResponse)
async def create_purchase(
    purchase: PurchaseCreate,
    current_user=Depends(check_role(["admin", "manager"])),
):
    async with db_connection() as conn:
        async with conn.transaction():
            try:
                # 1. Generate Purchase Number (Race-condition-safe: PUR-YYYYMMDD-XXXXXX)
                # nextval() is atomic and non-transactional — guarantees uniqueness
                # under full concurrent load without SELECT COUNT(*) collisions.
                date_str = datetime.now().strftime("%Y%m%d")
                seq_val = await conn.fetchval("SELECT nextval('purchase_seq')")
                purchase_number = f"PUR-{date_str}-{str(seq_val).zfill(6)}"

                # 2. Insert Purchase (Includes type, reference_number, tax)
                branch_id = current_user["branch_id"]
                purchase_row = await conn.fetchrow(
                    """INSERT INTO purchases (purchase_number, reference_number, branch_id, supplier_id, type, subtotal, tax, total, paid_amount, notes, created_by)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *""",
                    purchase_number, purchase.reference_number, branch_id, purchase.supplier_id, 
                    purchase.type, purchase.subtotal, purchase.tax, purchase.total, 
                    purchase.paid_amount, purchase.notes, current_user["id"]
                )
                purchase_id = purchase_row["id"]

                # 3. Process Items
                processed_items = []
                for item in purchase.items:
                    # A. Insert Purchase Item (Includes both price and cost_price)
                    item_row = await conn.fetchrow(
                        """INSERT INTO purchase_items (purchase_id, product_id, qty, price, cost_price, total, warehouse_id)
                           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
                        purchase_id, item.product_id, item.qty, item.price, item.price, (item.qty * item.price), item.warehouse_id
                    )
                    
                    # B. Check current stock
                    stock = await conn.fetchrow(
                        "SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2",
                        item.product_id, item.warehouse_id
                    )
                    qty_before = stock["quantity"] if stock else 0
                    qty_after = qty_before + item.qty

                    # C. Update Stock (Insert or Update)
                    if stock:
                        await conn.execute(
                            "UPDATE stock SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
                            qty_after, item.product_id, item.warehouse_id
                        )
                    else:
                        await conn.execute(
                            "INSERT INTO stock (product_id, warehouse_id, quantity, branch_id) VALUES ($1, $2, $3, $4)",
                            item.product_id, item.warehouse_id, qty_after, branch_id
                        )

                    # D. Update Product cost_price — Weighted Average Cost (WAC)
                    # Formula: new_cost = (old_cost × old_qty + new_price × new_qty) / (old_qty + new_qty)
                    # This ensures blended cost is preserved across multiple purchase batches.
                    # Example: 100 units @ 10 EGP + 50 units @ 12 EGP → (1000 + 600) / 150 = 10.67 EGP
                    if qty_before > 0:
                        # Fetch the current cost_price for WAC calculation
                        old_cost = await conn.fetchval(
                            "SELECT cost_price FROM products WHERE id = $1",
                            item.product_id
                        )
                        old_cost = old_cost or 0
                        weighted_avg_cost = (
                            (old_cost * qty_before) + (item.price * item.qty)
                        ) / (qty_before + item.qty)
                    else:
                        # No prior stock — use the purchase price directly
                        weighted_avg_cost = item.price

                    await conn.execute(
                        "UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2",
                        weighted_avg_cost, item.product_id
                    )

                    # E. Log Stock Movement
                    await conn.execute(
                        """INSERT INTO stock_movements (product_id, branch_id, warehouse_id, type, qty_change, qty_before, qty_after, reference_type, reference_id, created_by)
                           VALUES ($1, $2, $3, 'purchase', $4, $5, $6, 'purchase', $7, $8)""",
                        item.product_id, branch_id, item.warehouse_id, item.qty, qty_before, qty_after, purchase_id, current_user["id"]
                    )

                    processed_items.append(dict(item_row))

                # 4. Update Supplier Balance if Credit
                if purchase.type == "credit":
                    # For purchase: we owe the supplier (balance increases)
                    debt = purchase.total - purchase.paid_amount
                    if debt > 0:
                        await conn.execute(
                            "UPDATE suppliers SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
                            debt, purchase.supplier_id
                        )

                # 5. Return complete response
                result = dict(purchase_row)
                result["items"] = processed_items
                return result

            except Exception as e:
                logging.error(f"[purchases] {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.get("/", response_model=List[PurchaseResponse])
async def list_purchases(
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT p.*, s.name as supplier_name
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE 1=1
        """
        params = []
        if current_user["role"] != "admin":
            query += " AND p.branch_id = $1"
            params.append(current_user["branch_id"])
            
        query += f" ORDER BY p.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([limit, offset])
        
        purchase_rows = await conn.fetch(query, *params)
        if not purchase_rows:
            return []

        purchase_ids = [row["id"] for row in purchase_rows]
        
        # Optimized: Fetch all items for these purchases in a single query
        items_query = """
            SELECT pi.*, pr.name as product_name 
            FROM purchase_items pi 
            JOIN products pr ON pi.product_id = pr.id 
            WHERE pi.purchase_id = ANY($1)
        """
        item_rows = await conn.fetch(items_query, purchase_ids)
        
        # Group items by purchase_id using Python dictionary for O(1) lookup
        items_by_purchase = {}
        for item in item_rows:
            pur_id = item["purchase_id"]
            if pur_id not in items_by_purchase:
                items_by_purchase[pur_id] = []
            items_by_purchase[pur_id].append(dict(item))
            
        # Build the final response list matching the schema
        purchases = []
        for row in purchase_rows:
            pur = dict(row)
            pur["items"] = items_by_purchase.get(pur["id"], [])
            purchases.append(pur)
            
        return purchases
