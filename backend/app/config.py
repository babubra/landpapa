from pydantic_settings import BaseSettings
from typing import List, Any
from pydantic import validator


class Settings(BaseSettings):
    # База данных
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"
    
    # JWT
    secret_key: str = "your-super-secret-key-change-in-production"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    @validator("cors_origins", pre=True)
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            import json
            if isinstance(v, str):
                v = json.loads(v)
            return v
        return v
    
    # Приложение
    debug: bool = True
    
    class Config:
        env_file = ".env"


settings = Settings()
