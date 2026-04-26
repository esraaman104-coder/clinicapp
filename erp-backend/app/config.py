from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationInfo
import logging
import re

# أنماط ضعيفة قابلة للتخمين
WEAK_PATTERNS = re.compile(
    r'(secret|key|password|pass|erp|admin|test|demo|change|example|'
    r'202[0-9]|123|abc)',
    re.IGNORECASE
)

class Settings(BaseSettings):
    # App Environment
    ENV: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security: JWT Configuration
    JWT_SECRET: str = "your-secret-key-change-it"
    SUPABASE_JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes for better security
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7    # 7 days for persistent login

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str, info: ValidationInfo):
        # Check environment (default to development if not set)
        env = info.data.get("ENV", "development")
        
        # 1. تحقق من القيمة الافتراضية
        if v == "your-secret-key-change-it":
            msg = "JWT_SECRET must not be the default value."
            if env == "production":
                raise ValueError(msg)
            logging.warning(f"SECURITY WARNING: {msg}")
            
        # 2. تحقق من الطول
        if len(v) < 32:
            msg = "JWT_SECRET length must be >= 32 characters."
            if env == "production":
                raise ValueError(msg)
            logging.warning(f"SECURITY WARNING: {msg}")

        # 3. تحقق من الأنماط البشرية القابلة للتخمين
        if WEAK_PATTERNS.search(v):
            msg = (
                "JWT_SECRET يبدو أنه يحتوي على كلمات قابلة للتخمين. "
                'استخدم: python -c "import secrets; print(secrets.token_hex(32))"'
            )
            if env == "production":
                raise ValueError(msg)
            logging.warning(f"SECURITY WARNING: {msg}")
            
        return v

    @field_validator("SUPABASE_JWT_SECRET")
    @classmethod
    def validate_supabase_jwt(cls, v: str, info: ValidationInfo):
        env = info.data.get("ENV", "development")
        if env == "production" and not v:
            raise ValueError("SUPABASE_JWT_SECRET is required in production environment.")
        return v

    class Config:
        env_file = ".env"

settings = Settings()
