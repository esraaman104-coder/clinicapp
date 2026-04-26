from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
import logging
from ...database import db_connection
from ...auth.router import get_current_user
from .schemas import PaymentCreate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        async with conn.transaction():
            try:
                branch_id = current_user["branch_id"]
                
                # 1. Insert Payment Record
                payment_row = await conn.fetchrow(
                    """INSERT INTO payments (entity_type, entity_id, invoice_id, purchase_id, amount, method, notes, branch_id, created_by)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *""",
                    payment.entity_type, payment.entity_id, payment.invoice_id, 
                    payment.purchase_id, payment.amount, payment.method, payment.notes,
                    branch_id, current_user["id"]
                )

                # 2. Update Entity Balance
                if payment.entity_type == "customer":
                    # For customer: payment reduces their debt (balance)
                    await conn.execute(
                        "UPDATE customers SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
                        payment.amount, payment.entity_id
                    )
                    
                    # If tied to a specific invoice, update paid_amount
                    if payment.invoice_id:
                        await conn.execute(
                            "UPDATE invoices SET paid_amount = paid_amount + $1, updated_at = NOW() WHERE id = $2",
                            payment.amount, payment.invoice_id
                        )
                
                elif payment.entity_type == "supplier":
                    # For supplier: payment reduces what we owe them (balance)
                    await conn.execute(
                        "UPDATE suppliers SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
                        payment.amount, payment.entity_id
                    )
                    
                    # If tied to a specific purchase, update paid_amount
                    if payment.purchase_id:
                        await conn.execute(
                            "UPDATE purchases SET paid_amount = paid_amount + $1, updated_at = NOW() WHERE id = $2",
                            payment.amount, payment.purchase_id
                        )

                return dict(payment_row)

            except Exception as e:
                logging.error(f"[payments] {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    entity_id: Optional[UUID] = None,
    current_user=Depends(get_current_user),
):
    async with db_connection() as conn:
        query = "SELECT * FROM payments WHERE 1=1"
        params = []
        if current_user["role"] != "admin":
            query += " AND branch_id = $1"
            params.append(current_user["branch_id"])
            
        if entity_id:
            p_idx = len(params) + 1
            query += f" AND entity_id = ${p_idx}"
            params.append(entity_id)
            
        query += " ORDER BY created_at DESC"
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]
