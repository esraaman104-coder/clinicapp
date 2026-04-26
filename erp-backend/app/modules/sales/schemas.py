from pydantic import BaseModel, Field, field_validator, ValidationInfo
from uuid import UUID
from typing import List, Optional, Literal
from datetime import datetime

class InvoiceItemCreate(BaseModel):
    product_id: UUID
    qty: float = Field(gt=0, description="الكمية يجب أن تكون أكبر من صفر")
    price: float = Field(ge=0, description="السعر يجب أن يكون صفر أو أكثر")
    warehouse_id: UUID

class InvoiceCreate(BaseModel):
    customer_id: Optional[UUID] = None
    type: Literal["cash", "credit"]
    subtotal: float = Field(ge=0)
    discount: float = Field(ge=0, default=0.0)
    tax: float = Field(ge=0, default=0.0)
    total: float = Field(ge=0)
    paid_amount: float = Field(ge=0, default=0.0)
    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(min_length=1, description="يجب إضافة صنف واحد على الأقل")

    @field_validator('items')
    @classmethod
    def check_items_not_empty(cls, v: List[InvoiceItemCreate]) -> List[InvoiceItemCreate]:
        if not v:
            raise ValueError("يجب إضافة صنف واحد على الأقل")
        return v

    @field_validator('total')
    @classmethod
    def check_total_amount(cls, v: float, info: ValidationInfo) -> float:
        subtotal = info.data.get('subtotal', 0.0)
        discount = info.data.get('discount', 0.0)
        if v < (subtotal - discount):
            raise ValueError("الإجمالي لا يمكن أن يقل عن الصافي بعد الخصم")
        return v

class InvoiceItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    qty: float
    price: float
    total: float
    warehouse_id: UUID

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    branch_id: UUID
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    type: str
    status: str
    subtotal: float
    discount: float
    tax: float
    total: float
    paid_amount: float
    notes: Optional[str] = None
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True
