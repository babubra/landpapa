from datetime import datetime
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Lead(Base):
    """Кастомная заявка на обратный звонок или подбор участка (Лид)."""
    
    __tablename__ = "leads"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), index=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Мета-данные для аналитики и защиты
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # С какой страницы пришла заявка
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Статус обработки
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)  # new, processing, completed, rejected
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<Lead(id={self.id}, phone='{self.phone}', status='{self.status}')>"
