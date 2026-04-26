from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class PaymentCreate(BaseModel):
    entity_type: str # 'customer' or 'supplier'
    entity_id: UUID
    invoice_id: Optional[UUID] = None
    purchase_id: Optional[UUID] = None
    amount: float
    method: str = 'cash'
    notes: Optional[str] = None

class PaymentResponse(PaymentCreate):
    id: UUID
    branch_id: UUID
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True
