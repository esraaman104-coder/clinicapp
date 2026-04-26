from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    role: Optional[str] = None
    branch_id: Optional[UUID] = None
    type: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    branch_id: Optional[UUID]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
