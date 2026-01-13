"""
Схемы для публичного API участков (viewport-based загрузка).
"""

from pydantic import BaseModel, Field
from app.models.plot import PlotStatus


class PlotViewportItem(BaseModel):
    """Участок для отображения на карте в viewport."""
    id: int
    cadastral_number: str | None = None
    area: float | None = Field(None, description="Площадь в м²")
    price_public: int | None = Field(None, description="Публичная цена")
    status: PlotStatus
    polygon_coords: list[list[float]] = Field(description="Координаты полигона [[lat, lon], ...]")
    listing_id: int | None = None
    
    class Config:
        from_attributes = True


class ClusterItem(BaseModel):
    """Кластер участков для отображения на низких зумах."""
    center: list[float] = Field(description="Центр кластера [lat, lon]")
    count: int = Field(description="Количество участков в кластере")
    bounds: list[list[float]] = Field(description="Границы кластера [[south, west], [north, east]]")
    price_range: tuple[int, int] | None = Field(None, description="Диапазон цен (min, max)")


class PlotViewportResponse(BaseModel):
    """Ответ API для viewport-based загрузки."""
    zoom: int = Field(description="Уровень зума")
    plots: list[PlotViewportItem] = Field(default_factory=list, description="Участки (для высоких зумов)")
    clusters: list[ClusterItem] = Field(default_factory=list, description="Кластеры (для низких зумов)")
    total_in_viewport: int = Field(description="Общее количество участков в viewport")
