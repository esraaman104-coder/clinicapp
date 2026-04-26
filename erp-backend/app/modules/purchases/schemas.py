from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from typing import List, Optional, Literal
from datetime import datetime

class PurchaseItemCreate(BaseModel):
    product_id: UUID
    qty: float = Field(gt=0, description="الكمية يجب أن تكون أكبر من صفر")
    price: float = Field(ge=0, description="السعر يجب أن يكون صفر أو أكثر")
    warehouse_id: UUID

class PurchaseCreate(BaseModel):
    supplier_id: UUID
    reference_number: Optional[str] = None
    type: Literal["cash", "credit"]
    subtotal: float = Field(ge=0)
    tax: float = Field(ge=0, default=0.0)
    total: float = Field(ge=0)
    paid_amount: float = Field(ge=0, default=0.0)
    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = Field(min_length=1, description="يجب إضافة صنف واحد على الأقل")

    @model_validator(mode='after')
    def check_cash_payment(self) -> 'PurchaseCreate':
        if self.type == 'cash' and abs(self.paid_amount - self.total) > 0.01:
            raise ValueError("في حالة الدفع النقدي، يجب أن يكون المبلغ المدفوع مساوياً للإجمالي")
        return self

class PurchaseItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    qty: float
    price: float
    total: float
    warehouse_id: UUID

    class Config:
        from_attributes = True

class PurchaseResponse(BaseModel):
    id: UUID
    purchase_number: str
    reference_number: Optional[str] = None
    branch_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    type: str
    status: str
    subtotal: float
    tax: float
    total: float
    paid_amount: float
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseItemResponse] = []

    class Config:
        from_attributes = True
