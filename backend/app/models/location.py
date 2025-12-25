from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class District(Base):
    """Район Калининградской области."""

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))  # "Зеленоградский район"
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # "zelenogradsk"
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
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Связи
    district: Mapped["District"] = relationship("District", back_populates="settlements")

    def __repr__(self) -> str:
        return f"<Settlement(id={self.id}, name='{self.name}')>"
