from fastapi import HTTPException, status, Depends
from typing import List
from ..auth.router import get_current_user

def check_role(allowed_roles: List[str]):
    """Dependency to check if user has one of the allowed roles."""
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def branch_filter(query: str, current_user: dict):
    """
    Helper to append branch_id filter to SQL queries.
    If user is admin, no filter is applied.
    """
    if current_user["role"] == "admin":
        return query, []
    
    # Simple implementation: append WHERE or AND
    # This is a conceptual helper, actual implementation depends on query structure
    filter_sql = " branch_id = $1 "
    if "WHERE" in query.upper():
        query += f" AND {filter_sql}"
    else:
        query += f" WHERE {filter_sql}"
    
    return query, [current_user["branch_id"]]
