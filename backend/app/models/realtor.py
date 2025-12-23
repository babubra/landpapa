from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Realtor(Base):
    """Риэлтор — контактное лицо для объявлений.
    
    Телефон риэлтора отображается в объявлении.
    """
    
    __tablename__ = "realtors"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))  # ФИО
    phone: Mapped[str] = mapped_column(String(50))  # Телефон для публикации
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Название компании
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    def __repr__(self) -> str:
        return f"<Realtor(id={self.id}, name='{self.name}')>"
