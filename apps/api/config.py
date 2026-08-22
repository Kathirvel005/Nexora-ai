import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nexora Intelligence Platform"
    API_V1_STR: str = "/api"
    
    # Security
    JWT_SECRET: str = "nexora_jwt_secret_key_change_me_in_production_1234567890"
    JWT_REFRESH_SECRET: str = "nexora_jwt_refresh_secret_key_change_me_in_production_1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for convenience in demo
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database (Postgres default, auto-fallback to SQLite in code if connection fails)
    DATABASE_URL: str = "sqlite:///./nexora.db"
    
    # Redis (Optional, fallback to in-memory in code if missing/connection fails)
    REDIS_URL: str = ""
    
    # AI/ML
    GEMINI_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
