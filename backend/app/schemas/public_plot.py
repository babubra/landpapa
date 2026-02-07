"""
Схемы для публичного API участков.
"""

from pydantic import BaseModel, Field


class PlotPoint(BaseModel):
    """Точка участка для отображения на карте."""
    id: int
    lat: float
    lon: float
    price: int | None = None
    listing_slug: str
    title: str | None = None  # H1 генерируется на фронте
    location_slug: str | None = None
    location_parent_slug: str | None = None
    location_type: str | None = None


class PlotAllResponse(BaseModel):
    """Ответ API для загрузки всех участков."""
    plots: list[PlotPoint] = Field(default_factory=list, description="Список участков")
    total: int = Field(description="Общее количество участков")
