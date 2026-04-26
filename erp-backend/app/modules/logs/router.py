from fastapi import APIRouter, Depends, Query
from ...database import db_connection
from ...auth.router import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/logs", tags=["audit"])

@router.get("")
async def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    module: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    async with db_connection() as conn:
        if current_user["role"] != "admin":
            # Non-admins can only see logs for their branch
            query = """
                SELECT l.*, u.name as user_name 
                FROM logs l 
                JOIN users u ON l.user_id = u.id 
                WHERE l.branch_id = $1
            """
            params = [current_user["branch_id"]]
        else:
            query = """
                SELECT l.*, u.name as user_name 
                FROM logs l 
                JOIN users u ON l.user_id = u.id 
                WHERE 1=1
            """
            params = []

        if module:
            p_idx = len(params) + 1
            query += f" AND l.module = ${p_idx}"
            params.append(module)

        # Correct column is 'timestamp', not 'created_at'
        query += f" ORDER BY l.timestamp DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([limit, offset])

        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]
