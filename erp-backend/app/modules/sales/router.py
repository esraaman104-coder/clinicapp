from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
import json
import logging
from ...database import db_connection
from ...auth.router import get_current_user
from .schemas import InvoiceCreate, InvoiceResponse, InvoiceItemResponse
from datetime import datetime

router = APIRouter(prefix="/sales", tags=["sales"])

@router.post("/invoice", response_model=InvoiceResponse)
async def create_invoice(
    invoice: InvoiceCreate,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        async with conn.transaction():
            try:
                # 1. Generate Invoice Number (Race-condition-safe: INV-YYYYMMDD-XXXXXX)
                # nextval() is atomic and non-transactional — guarantees uniqueness
                # under full concurrent load without SELECT COUNT(*) collisions.
                date_str = datetime.now().strftime("%Y%m%d")
                seq_val = await conn.fetchval("SELECT nextval('invoice_seq')")
                invoice_number = f"INV-{date_str}-{str(seq_val).zfill(6)}"

                # 2. Insert Invoice
                branch_id = current_user["branch_id"]
                if not branch_id and current_user["role"] == "admin":
                    raise HTTPException(status_code=400, detail="Admin must be assigned to a branch to create invoices")

                invoice_row = await conn.fetchrow(
                    """INSERT INTO invoices (invoice_number, branch_id, customer_id, type, subtotal, discount, tax, total, paid_amount, notes, created_by)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *""",
                    invoice_number, branch_id, invoice.customer_id, invoice.type, 
                    invoice.subtotal, invoice.discount, invoice.tax, invoice.total, 
                    invoice.paid_amount, invoice.notes, current_user["id"]
                )
                invoice_id = invoice_row["id"]

                # 3. Process Items
                processed_items = []
                for item in invoice.items:
                    # A. Check Stock
                    stock = await conn.fetchrow(
                        "SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2",
                        item.product_id, item.warehouse_id
                    )
                    if not stock or stock["quantity"] < item.qty:
                        product_name = await conn.fetchval("SELECT name FROM products WHERE id = $1", item.product_id)
                        raise HTTPException(status_code=400, detail=f"Insufficient stock for {product_name}")

                    # B. Get Cost Price
                    cost_price = await conn.fetchval("SELECT cost_price FROM products WHERE id = $1", item.product_id)

                    # C. Insert Invoice Item
                    item_row = await conn.fetchrow(
                        """INSERT INTO invoice_items (invoice_id, product_id, qty, price, cost_price, total, warehouse_id)
                           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
                        invoice_id, item.product_id, item.qty, item.price, cost_price, (item.qty * item.price), item.warehouse_id
                    )
                    
                    # D. Update Stock
                    qty_before = stock["quantity"]
                    qty_after = qty_before - item.qty
                    await conn.execute(
                        "UPDATE stock SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
                        qty_after, item.product_id, item.warehouse_id
                    )

                    # E. Log Stock Movement
                    await conn.execute(
                        """INSERT INTO stock_movements (product_id, branch_id, warehouse_id, type, qty_change, qty_before, qty_after, reference_type, reference_id, created_by)
                           VALUES ($1, $2, $3, 'sale', $4, $5, $6, 'invoice', $7, $8)""",
                        item.product_id, branch_id, item.warehouse_id, -item.qty, qty_before, qty_after, invoice_id, current_user["id"]
                    )

                    processed_items.append(dict(item_row))

                # 4. Update Customer Balance if Credit
                if invoice.type == "credit" and invoice.customer_id:
                    debt = invoice.total - invoice.paid_amount
                    await conn.execute(
                        "UPDATE customers SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
                        debt, invoice.customer_id
                    )

                # 5. RULE-003: Audit Log
                await conn.execute(
                    """INSERT INTO logs (user_id, branch_id, module, action, new_value)
                       VALUES ($1, $2, 'sales', 'create_invoice', $3::jsonb)""",
                    current_user["id"], branch_id,
                    json.dumps({
                        "invoice_number": invoice_number,
                        "total": float(invoice.total),
                        "type": invoice.type,
                        "items_count": len(invoice.items)
                    }, ensure_ascii=False),
                )

                result = dict(invoice_row)
                result["items"] = processed_items
                return result

            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                logging.error(f"[sales] {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = """
            SELECT i.*, c.name as customer_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE 1=1
        """
        params = []
        if current_user["role"] != "admin":
            query += " AND i.branch_id = $1"
            params.append(current_user["branch_id"])
            
        query += f" ORDER BY i.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([limit, offset])
        
        invoice_rows = await conn.fetch(query, *params)
        if not invoice_rows:
            return []

        invoice_ids = [row["id"] for row in invoice_rows]
        
        # Optimized: Fetch all items for these invoices in a single query
        items_query = """
            SELECT ii.*, p.name as product_name 
            FROM invoice_items ii 
            JOIN products p ON ii.product_id = p.id 
            WHERE ii.invoice_id = ANY($1)
        """
        item_rows = await conn.fetch(items_query, invoice_ids)
        
        # Group items by invoice_id using Python dictionary for O(1) lookup
        items_by_invoice = {}
        for item in item_rows:
            inv_id = item["invoice_id"]
            if inv_id not in items_by_invoice:
                items_by_invoice[inv_id] = []
            items_by_invoice[inv_id].append(dict(item))
            
        # Build the final response list matching the schema
        invoices = []
        for row in invoice_rows:
            inv = dict(row)
            inv["items"] = items_by_invoice.get(inv["id"], [])
            invoices.append(inv)
            
        return invoices
