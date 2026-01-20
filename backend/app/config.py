from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any
from pydantic import field_validator


class Settings(BaseSettings):
    # База данных (синхронная)
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"
    
    # База данных (асинхронная) - автоматически генерируется из database_url
    @property
    def async_database_url(self) -> str:
        """Преобразует sync URL в async URL (postgresql → postgresql+asyncpg)."""
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
    
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

    # Uploads
    upload_dir: str = "uploads"
    max_upload_size: int = 5 * 1024 * 1024  # 5 MB

    # SMTP для восстановления пароля
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    emails_from: str = "noreply@rkkland.ru"
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


settings = Settings()
