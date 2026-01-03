from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Image(Base):
    """Универсальная таблица для хранения изображений.
    
    Может использоваться для: listings, news и других сущностей.
    """
    
    __tablename__ = "images"
    __table_args__ = (
        Index("ix_images_entity", "entity_type", "entity_id"),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Привязка к сущности (полиморфная связь)
    # Nullable для поддержки загрузки до создания сущности ("сироты")
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "listing", "news"
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Файлы
    url: Mapped[str] = mapped_column(String(500))  # Путь к оригиналу
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Миниатюра
    
    # Метаданные файла
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Bytes
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # SEO
    alt: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Порядок
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    def __repr__(self) -> str:
        return f"<Image(id={self.id}, entity='{self.entity_type}:{self.entity_id}')>"
