from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime
from ..database import db_connection
from .schemas import UserLogin, Token, UserResponse, TokenData, TokenRefreshRequest, LogoutRequest
from .service import verify_password, create_access_token, create_refresh_token
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    async with db_connection() as conn:
        # SELECT id, name, email, role, branch_id, is_active, created_at FROM users
        user = await conn.fetchrow("SELECT id, name, email, role, branch_id, is_active, created_at FROM users WHERE id = $1 AND is_active = TRUE", user_id)
        if user is None:
            raise credentials_exception
        return user

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, request: Request):
    async with db_connection() as conn:
        # SELECT id, name, email, password_hash, role, branch_id, is_active, created_at FROM users
        user = await conn.fetchrow("SELECT id, name, email, password_hash, role, branch_id, is_active, created_at FROM users WHERE email = $1 AND is_active = TRUE", login_data.email)
        if not user or not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        
        token_payload = {
            "sub": str(user["id"]), 
            "role": user["role"], 
            "branch_id": str(user["branch_id"]) if user["branch_id"] else None
        }
        
        access_token = create_access_token(data=token_payload)
        refresh_token = create_refresh_token(data=token_payload)
        
        # RULE-003: Audit Log
        await conn.execute(
            "INSERT INTO logs (user_id, branch_id, module, action, ip_address, timestamp) VALUES ($1, $2, $3, $4, $5, NOW())",
            user["id"], user["branch_id"], "auth", "login", request.client.host
        )
        
        return {
            "access_token": access_token, 
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_data: TokenRefreshRequest):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )
    try:
        payload = jwt.decode(refresh_data.refresh_token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    jti = payload.get("jti")
    if not jti:
        jti = f"{payload.get('sub')}-{payload.get('exp')}"

    async with db_connection() as conn:
        # Check blacklist
        blacklisted = await conn.fetchval("SELECT 1 FROM token_blacklist WHERE jti = $1", jti)
        if blacklisted:
            raise credentials_exception

        # SELECT id, name, email, role, branch_id, is_active, created_at FROM users
        user = await conn.fetchrow("SELECT id, name, email, role, branch_id, is_active, created_at FROM users WHERE id = $1 AND is_active = TRUE", user_id)
        if user is None:
            raise credentials_exception
        
        token_payload = {
            "sub": str(user["id"]), 
            "role": user["role"], 
            "branch_id": str(user["branch_id"]) if user["branch_id"] else None
        }
        
        new_access_token = create_access_token(data=token_payload)
        new_refresh_token = create_refresh_token(data=token_payload)
        
        # RULE-003: Audit Log
        await conn.execute(
            "INSERT INTO logs (user_id, branch_id, module, action, timestamp) VALUES ($1, $2, $3, $4, NOW())",
            user["id"], user["branch_id"], "auth", "token_refresh"
        )
        
        return {
            "access_token": new_access_token, 
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

@router.post("/logout")
async def logout(logout_data: LogoutRequest, request: Request):
    try:
        payload = jwt.decode(logout_data.refresh_token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if not jti:
            jti = f"{payload.get('sub')}-{payload.get('exp')}"
        
        exp_timestamp = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_timestamp)
        
        async with db_connection() as conn:
            # Add to blacklist
            await conn.execute(
                "INSERT INTO token_blacklist (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                jti, expires_at
            )
            
            # Cleanup expired tokens (as requested by user)
            await conn.execute("DELETE FROM token_blacklist WHERE expires_at < NOW()")
            
            # Log
            user_id = payload.get("sub")
            await conn.execute(
                "INSERT INTO logs (user_id, module, action, ip_address, timestamp) VALUES ($1, $2, $3, $4, NOW())",
                user_id, "auth", "logout", request.client.host
            )
            
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
        
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    return dict(current_user)
