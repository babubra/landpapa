from datetime import datetime
from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
import enum

from app.database import Base


class PlotStatus(str, enum.Enum):
    """Статус участка."""
    active = "active"       # В продаже
    sold = "sold"           # Продан
    reserved = "reserved"   # Зарезервирован


class Plot(Base):
    """Земельный участок.
    
    Принадлежит объявлению (Listing). Содержит геоданные и характеристики.
    """
    
    __tablename__ = "plots"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), index=True, nullable=True)
    
    # Кадастр
    cadastral_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Классификация (связь со справочником)
    land_use_id: Mapped[int | None] = mapped_column(ForeignKey("references.id"), nullable=True)
    land_category_id: Mapped[int | None] = mapped_column(ForeignKey("references.id"), nullable=True)
    
    # Характеристики
    area: Mapped[float | None] = mapped_column(Float, nullable=True)  # Площадь в квадратных метрах
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Геоданные (PostGIS) — WGS84
    polygon = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
    centroid = mapped_column(Geometry("POINT", srid=4326), nullable=True)  # Центр полигона
    
    # Цена (публичная)
    price_public: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Полная цена
    price_per_sotka: Mapped[int | None] = mapped_column(Integer, nullable=True)  # За сотку
    
    # Цена (приватная — для внутреннего использования)
    price_private: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_per_sotka_private: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Статус
    status: Mapped[PlotStatus] = mapped_column(
        Enum(PlotStatus), default=PlotStatus.active
    )
    
    # Владелец (приватная информация)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("owners.id"), nullable=True)
    
    # Комментарий (собственность/аренда, продаётся вместе и т.д.)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Мета
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Связи
    listing: Mapped["Listing"] = relationship("Listing", back_populates="plots")
    land_use: Mapped["Reference"] = relationship(
        "Reference", foreign_keys=[land_use_id], lazy="joined"
    )
    land_category: Mapped["Reference"] = relationship(
        "Reference", foreign_keys=[land_category_id], lazy="joined"
    )
    owner: Mapped["Owner"] = relationship("Owner", lazy="joined")
    
    @property
    def latitude(self) -> float | None:
        """Широта центроида участка."""
        if self.centroid is None:
            return None
        from shapely import wkb
        point = wkb.loads(bytes(self.centroid.data))
        return point.y
    
    @property
    def longitude(self) -> float | None:
        """Долгота центроида участка."""
        if self.centroid is None:
            return None
        from shapely import wkb
        point = wkb.loads(bytes(self.centroid.data))
        return point.x
    
    @property
    def polygon_coords(self) -> list[list[float]] | None:
        """Координаты полигона участка [[lat, lon], ...]."""
        if self.polygon is None:
            return None
        from shapely import wkb
        poly = wkb.loads(bytes(self.polygon.data))
        # Возвращаем внешнее кольцо полигона
        coords = list(poly.exterior.coords)
        return [[coord[1], coord[0]] for coord in coords]  # [lat, lon]
    
    def __repr__(self) -> str:
        return f"<Plot(id={self.id}, cadastral='{self.cadastral_number}')>"


# Импорты для relationship
from app.models.listing import Listing
from app.models.reference import Reference
from app.models.owner import Owner
