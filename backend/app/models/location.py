from enum import Enum as PyEnum

from sqlalchemy import String, Integer, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# === Новая архитектура локаций ===

class LocationType(str, PyEnum):
    """Типы локаций в иерархии."""
    REGION = "region"           # Регион/область (верхний уровень)
    DISTRICT = "district"       # Муниципальный район
    CITY = "city"               # Город (городской округ или город внутри района)
    SETTLEMENT = "settlement"   # Населённый пункт внутри города


class Location(Base):
    """
    Единая модель для всех уровней локаций.
    
    Иерархия:
    - Region (parent_id=NULL) → Калининградская область
    - District (parent=Region) → Зеленоградский р-н, Гурьевский р-н
    - City (parent=Region ИЛИ District) → Калининград, Зеленоградск
    - Settlement (parent=City) → Синявино, Покровское
    
    Примеры:
    - Калининград: type=CITY, parent=Калининградская обл (Region)
    - Зеленоградск: type=CITY, parent=Зеленоградский р-н (District)
    - Синявино: type=SETTLEMENT, parent=Янтарный (City)
    """

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))  # "Калининград", "Зеленоградский р-н"
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    fias_id: Mapped[str | None] = mapped_column(
        String(36), unique=True, index=True, nullable=True
    )
    type: Mapped[LocationType] = mapped_column(
        SQLEnum(LocationType), default=LocationType.SETTLEMENT
    )
    settlement_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "г", "пос", "пгт", "с" — для отображения
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # SEO: склонённая форма для мета-тегов ("в Калининграде", "в Зеленоградске")
    name_locative: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # SEO: краткое описание для geo-страниц (отображается под H1)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Связи
    parent: Mapped["Location | None"] = relationship(
        "Location",
        remote_side="Location.id",
        back_populates="children",
        lazy="joined"
    )
    children: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="parent",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Location(id={self.id}, type={self.type.value}, name='{self.name}')>"
    
    def get_full_path(self) -> list["Location"]:
        """Возвращает путь от текущей локации до корня (Region)."""
        path = [self]
        current = self
        while current.parent:
            path.append(current.parent)
            current = current.parent
        path.reverse()
        return path
    
    def get_display_name(self) -> str:
        """Возвращает отображаемое имя с типом (если есть)."""
        if self.settlement_type:
            return f"{self.settlement_type}. {self.name}"
        return self.name


# === Старые модели (для обратной совместимости и миграции) ===


class District(Base):
    """Район Калининградской области."""

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))  # "Зеленоградский район"
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # "zelenogradsk"
    fias_id: Mapped[str | None] = mapped_column(String(36), unique=True, index=True, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Связи
    settlements: Mapped[list["Settlement"]] = relationship(
        "Settlement", back_populates="district", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<District(id={self.id}, name='{self.name}')>"


class Settlement(Base):
    """Населённый пункт."""

    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))  # "пос. Янтарный"
    slug: Mapped[str] = mapped_column(String(100), index=True)  # "yantarny"
    fias_id: Mapped[str | None] = mapped_column(String(36), unique=True, index=True, nullable=True)
    type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "г", "пос", "с"
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Связи
    district: Mapped["District"] = relationship("District", back_populates="settlements", lazy="joined")

    def __repr__(self) -> str:
        return f"<Settlement(id={self.id}, name='{self.name}')>"
