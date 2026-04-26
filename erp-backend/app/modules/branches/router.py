from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from ...database import db_connection
from ...auth.router import get_current_user
from ...middleware.auth_middleware import check_role
from .schemas import BranchCreate, BranchResponse

router = APIRouter(prefix="/branches", tags=["branches"])

@router.get("/", response_model=List[BranchResponse])
async def list_branches(
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        rows = await conn.fetch("SELECT * FROM branches ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@router.post("/", response_model=BranchResponse)
async def create_branch(
    branch: BranchCreate,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        row = await conn.fetchrow(
            "INSERT INTO branches (name, location, is_active) VALUES ($1, $2, $3) RETURNING *",
            branch.name, branch.location, branch.is_active
        )
        return dict(row)

@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    branch: BranchCreate,
    current_user=Depends(check_role(["admin"])),
):
    async with db_connection() as conn:
        row = await conn.fetchrow(
            "UPDATE branches SET name=$1, location=$2, is_active=$3, updated_at=NOW() WHERE id=$4 RETURNING *",
            branch.name, branch.location, branch.is_active, branch_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Branch not found")
        return dict(row)
