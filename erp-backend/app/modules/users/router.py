from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from ...auth.service import get_password_hash
from ...middleware.auth_middleware import check_role
from .schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    branch_id: Optional[UUID] = None,
    current_user=Depends(check_role(["admin", "manager"])),
):
    async with db_connection() as conn:
        query = "SELECT id, name, email, role, branch_id, is_active, created_at FROM users WHERE is_active = TRUE"
        params = []
        
        # Branch isolation for managers
        if current_user["role"] == "manager":
            query += " AND branch_id = $1"
            params.append(current_user["branch_id"])
        elif branch_id:
            query += " AND branch_id = $1"
            params.append(branch_id)
            
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        hashed_password = get_password_hash(user.password)
        row = await conn.fetchrow(
            """INSERT INTO users (name, email, password_hash, role, branch_id, is_active) 
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, branch_id, is_active, created_at""",
            user.name, user.email, hashed_password, user.role, user.branch_id, user.is_active
        )
        return dict(row)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user: UserUpdate,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        # Check if user exists
        existing = await conn.fetchrow("SELECT id, password_hash FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
            
        hashed_password = get_password_hash(user.password) if user.password else existing["password_hash"]
        
        row = await conn.fetchrow(
            """UPDATE users SET name=$1, email=$2, password_hash=$3, role=$4, branch_id=$5, is_active=$6, updated_at=NOW() 
               WHERE id=$7 RETURNING id, name, email, role, branch_id, is_active, created_at""",
            user.name, user.email, hashed_password, user.role, user.branch_id, user.is_active, user_id
        )
        return dict(row)

@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        # Soft delete
        result = await conn.execute("UPDATE users SET is_active = FALSE WHERE id = $1", user_id)
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully (soft delete)"}
