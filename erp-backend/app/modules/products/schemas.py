from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    unit: str
    cost_price: float = 0.0
    sale_price: float = 0.0
    category_id: Optional[UUID] = None
    min_stock: float = 0.0
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: UUID
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
