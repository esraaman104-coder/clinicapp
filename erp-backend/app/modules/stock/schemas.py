from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import datetime

class StockBase(BaseModel):
    product_id: UUID
    branch_id: UUID
    warehouse_id: Optional[UUID] = None
    quantity: float

class StockResponse(StockBase):
    id: UUID
    updated_at: datetime
    product_name: Optional[str] = None
    sale_price: Optional[float] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    min_stock: Optional[float] = None
    category_name: Optional[str] = None
    branch_name: Optional[str] = None
    warehouse_name: Optional[str] = None

    class Config:
        from_attributes = True

class StockMovementResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    type: str
    qty_change: float
    qty_before: float
    qty_after: float
    created_at: datetime
    created_by_name: Optional[str] = None

class StockAdjustment(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    new_quantity: float = Field(ge=0, description="الكمية لا يمكن أن تكون سالبة")
    reason: Optional[str] = "Manual adjustment"
