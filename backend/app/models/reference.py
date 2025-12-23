from datetime import datetime
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Reference(Base):
    """Универсальный справочник для всех типов данных.
    
    Типы:
    - land_use: Разрешённое использование (ИЖС, ЛПХ, СНТ...)
    - land_category: Категория земель
    """
    
    __tablename__ = "references"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(50), index=True)  # "land_use", "land_category"
    code: Mapped[str] = mapped_column(String(50))  # "izhs", "lph"
    name: Mapped[str] = mapped_column(String(255))  # "ИЖС", "ЛПХ"
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    def __repr__(self) -> str:
        return f"<Reference(type='{self.type}', code='{self.code}')>"
