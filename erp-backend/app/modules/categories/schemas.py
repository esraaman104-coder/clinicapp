from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    color: str = '#C17A2B'
    description: Optional[str] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
