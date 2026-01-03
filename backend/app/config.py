from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any
from pydantic import field_validator


class Settings(BaseSettings):
    # База данных
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"
    
    # JWT
    secret_key: str = "your-super-secret-key-change-in-production"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    # Fallback to comma split if JSON fails but starts with [
                    return [i.strip() for i in v.replace("[", "").replace("]", "").split(",")]
            else:
                return [i.strip() for i in v.split(",")]
        return v
    
    # Приложение
    debug: bool = True

    # DaData
    dadata_api_key: str | None = None
    dadata_secret_key: str | None = None

    # Uploads
    upload_dir: str = "uploads"
    max_upload_size: int = 5 * 1024 * 1024  # 5 MB

    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
