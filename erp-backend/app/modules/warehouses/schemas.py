from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class WarehouseBase(BaseModel):
    name: str
    branch_id: UUID
    location: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
