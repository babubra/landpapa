from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Listing(Base):
    """Объявление о продаже земельных участков.
    
    Может содержать один или несколько участков (массив смежных участков).
    """
    
    __tablename__ = "listings"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    
    # Контент
    title: Mapped[str] = mapped_column(String(500))  # Название объявления
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # HTML описание
    
    # Риэлтор (контактное лицо)
    realtor_id: Mapped[int] = mapped_column(ForeignKey("realtors.id"))
    
    # Публикация
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)  # Специальное предложение
    
    # SEO
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Мета
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Связи
    realtor: Mapped["Realtor"] = relationship("Realtor", lazy="joined")
    plots: Mapped[list["Plot"]] = relationship("Plot", back_populates="listing", lazy="selectin")
    
    def __repr__(self) -> str:
        return f"<Listing(id={self.id}, slug='{self.slug}')>"
    
    @property
    def price_min(self) -> int | None:
        """Минимальная цена среди активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.price_public]
        return min(p.price_public for p in active_plots) if active_plots else None
    
    @property
    def price_max(self) -> int | None:
        """Максимальная цена среди активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.price_public]
        return max(p.price_public for p in active_plots) if active_plots else None
    
    @property
    def total_area(self) -> float | None:
        """Общая площадь активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.area]
        return sum(p.area for p in active_plots) if active_plots else None
    
    @property
    def plots_count(self) -> int:
        """Количество активных участков."""
        return len([p for p in self.plots if p.status == "active"])


# Импорт для relationship
from app.models.realtor import Realtor
from app.models.plot import Plot
