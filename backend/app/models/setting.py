"""
Модель для хранения настроек системы.
"""

from datetime import datetime
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Setting(Base):
    """
    Настройки системы (key-value).
    
    Примеры ключей:
    - nspd_proxy: прокси для NSPD клиента (format: user:pass@host:port)
    - nspd_timeout: таймаут для NSPD запросов в секундах
    """
    
    __tablename__ = "settings"
    
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<Setting(key='{self.key}')>"
