from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchResponse(BranchBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
