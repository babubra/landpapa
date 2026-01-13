"""
Схемы для публичного API участков (viewport-based загрузка).
"""

from typing import Literal
from pydantic import BaseModel, Field


class MapMarkerItem(BaseModel):
    """Унифицированный маркер для карты (точка или кластер)."""
    type: Literal["point", "cluster"]
    id: str  # "123" для точки, "123,456,789" для кластера
    lat: float
    lon: float
    count: int = 1
    # Только для point:
    price: int | None = None
    listing_slug: str | None = None
    # Только для cluster:
    bounds: list[list[float]] | None = None  # [[south, west], [north, east]]


class PlotViewportResponse(BaseModel):
    """Ответ API для viewport-based загрузки."""
    zoom: int = Field(description="Уровень зума")
    markers: list[MapMarkerItem] = Field(default_factory=list, description="Маркеры (точки и кластеры)")
    total_in_viewport: int = Field(description="Общее количество участков в viewport")
