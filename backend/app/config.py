from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application configuration settings"""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/paper_db"

    # File Storage
    upload_dir: str = "./storage/uploads"
    image_dir: str = "./storage/images"

    # File Upload Limits
    max_file_size: int = 10485760  # 10MB

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Ensure storage directories exist
def init_storage():
    """Initialize storage directories"""
    settings = get_settings()
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.image_dir, exist_ok=True)
