from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

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
    title_auto: Mapped[bool] = mapped_column(Boolean, default=True)  # Автогенерация названия

    # Локация (НОВАЯ модель — иерархическая)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True, index=True)
    
    # Локация (СТАРАЯ модель — для обратной совместимости, будет удалено после миграции)
    settlement_id: Mapped[int | None] = mapped_column(ForeignKey("settlements.id"), nullable=True)
    
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
    location: Mapped["Location | None"] = relationship("Location", lazy="joined")
    settlement: Mapped["Settlement | None"] = relationship("Settlement", lazy="joined")  # DEPRECATED
    plots: Mapped[list["Plot"]] = relationship("Plot", back_populates="listing", lazy="selectin")
    images: Mapped[list["Image"]] = relationship(
        "Image",
        primaryjoin="and_(foreign(Image.entity_type)=='listing', foreign(Image.entity_id)==Listing.id)",
        order_by="Image.sort_order",
        lazy="selectin",
        viewonly=True,  # Для безопасности будем управлять привязкой вручную через сервис, хотя можно и разрешить запись
    )
    
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
    def area_min(self) -> float | None:
        """Минимальная площадь среди активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.area]
        return min(p.area for p in active_plots) if active_plots else None
    
    @property
    def area_max(self) -> float | None:
        """Максимальная площадь среди активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.area]
        return max(p.area for p in active_plots) if active_plots else None
    
    @property
    def total_area(self) -> float | None:
        """Общая площадь активных участков."""
        active_plots = [p for p in self.plots if p.status == "active" and p.area]
        return sum(p.area for p in active_plots) if active_plots else None
    
    @property
    def plots_count(self) -> int:
        """Количество активных участков."""
        return len([p for p in self.plots if p.status == "active"])


    @property
    def main_image(self) -> "Image | None":
        """Главное изображение: сначала ищем с is_main=True, иначе первое в списке."""
        if not self.images:
            return None
        # Сначала ищем изображение с флагом is_main=True
        for img in self.images:
            if img.is_main:
                return img
        # Если нет is_main, возвращаем первое
        return self.images[0]

    @property
    def coordinates(self) -> list[list[float]]:
        """Координаты центроидов всех активных участков."""
        coords = []
        for plot in self.plots:
            if plot.status == "active" and plot.latitude and plot.longitude:
                coords.append([plot.latitude, plot.longitude])
        return coords

    @property
    def area_min(self) -> float | None:
        """Минимальная площадь среди активных участков."""
        areas = [p.area for p in self.plots if p.status == "active" and p.area]
        return min(areas) if areas else None

    @property
    def area_max(self) -> float | None:
        """Максимальная площадь среди активных участков."""
        areas = [p.area for p in self.plots if p.status == "active" and p.area]
        return max(areas) if areas else None

    @property
    def viewable_plots(self) -> list["Plot"]:
        """Участки для публичного отображения (в продаже или в резерве).
        
        Проданные участки (sold) исключаются из публичной страницы,
        но сохраняются в базе данных.
        """
        return [p for p in self.plots if p.status in ("active", "reserved")]

    @property
    def land_use_name(self) -> str | None:
        """Назначение земли из первого активного участка."""
        active = [p for p in self.plots if p.status == "active" and p.land_use]
        return active[0].land_use.name if active else None


# Импорт для relationship
from app.models.realtor import Realtor
from app.models.plot import Plot
from app.models.location import Settlement, Location
from app.models.image import Image

