"""
SEO-блоки для главной страницы.

Каждый блок — это «секция» на главной, которая автоматически
подтягивает листинги по привязке к локации и/или типу земли.
"""

from sqlalchemy import String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SeoBlock(Base):
    """Конфигурация SEO-блока на главной странице."""

    __tablename__ = "seo_blocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))  # «Участки в Зеленоградском районе»
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)  # «Лучшие предложения у моря»
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # SEO-текст с ключевыми словами
    link_url: Mapped[str] = mapped_column(String(255))  # «/zelenogradskij-r-n»

    # Фильтры для автоматической подборки листингов
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True, index=True
    )
    land_use_filter: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # Код из references: «izhs», «snt»

    # Управление отображением
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Связи
    location: Mapped["Location | None"] = relationship("Location", lazy="joined")

    def __repr__(self) -> str:
        return f"<SeoBlock(id={self.id}, title='{self.title}')>"


# Импорт для relationship
from app.models.location import Location
