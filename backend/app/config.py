from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # База данных
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Приложение
    debug: bool = True
    
    class Config:
        env_file = ".env"


settings = Settings()
