"""
Pydantic схемы для админского API участков.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from app.models.plot import PlotStatus


# === Вложенные схемы ===

class ReferenceShort(BaseModel):
    """Краткая информация о справочнике."""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class ListingShort(BaseModel):
    """Краткая информация об объявлении."""
    id: int
    slug: str
    title: str | None = None  # H1 генерируется на фронте
    is_published: bool = True  # Статус публикации для цветовой индикации на карте

    class Config:
        from_attributes = True


class OwnerShort(BaseModel):
    """Краткая информация о владельце."""
    id: int
    name: str
    phone: str | None

    class Config:
        from_attributes = True


# === Plot схемы ===

class PlotAdminListItem(BaseModel):
    """Участок в списке (для таблицы)."""
    id: int
    cadastral_number: str | None
    area: float | None
    address: str | None
    price_public: int | None
    price_per_sotka: int | None
    status: PlotStatus
    has_geometry: bool = False
    centroid_coords: list[float] | None = None  # [lon, lat]
    
    land_use: ReferenceShort | None = None
    land_category: ReferenceShort | None = None
    listing: ListingShort | None = None
    comment: str | None = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlotAdminDetail(BaseModel):
    """Детальная информация об участке."""
    id: int
    listing_id: int | None
    cadastral_number: str | None
    area: float | None
    address: str | None
    
    price_public: int | None
    price_per_sotka: int | None
    price_private: int | None
    price_per_sotka_private: int | None
    
    status: PlotStatus
    has_geometry: bool = False
    centroid_coords: list[float] | None = None  # [lon, lat]
    
    land_use: ReferenceShort | None = None
    land_category: ReferenceShort | None = None
    listing: ListingShort | None = None
    owner: OwnerShort | None = None
    comment: str | None = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlotCreate(BaseModel):
    """Создание участка."""
    listing_id: int | None = None
    cadastral_number: str | None = None
    land_use_id: int | None = None
    land_category_id: int | None = None
    area: float | None = None
    address: str | None = None
    price_public: int | None = None
    price_per_sotka: int | None = None
    price_private: int | None = None
    price_per_sotka_private: int | None = None
    status: PlotStatus = PlotStatus.active
    owner_id: int | None = None
    comment: str | None = None


class PlotUpdate(BaseModel):
    """Обновление участка."""
    listing_id: int | None = None
    cadastral_number: str | None = None
    land_use_id: int | None = None
    land_category_id: int | None = None
    area: float | None = None
    address: str | None = None
    price_public: int | None = None
    price_per_sotka: int | None = None
    price_private: int | None = None
    price_per_sotka_private: int | None = None
    status: PlotStatus | None = None
    owner_id: int | None = None
    comment: str | None = None


class PlotListResponse(BaseModel):
    """Ответ списка участков с пагинацией."""
    items: list[PlotAdminListItem]
    total: int
    page: int
    size: int
    pages: int


class BulkDeleteRequest(BaseModel):
    """Запрос на массовое удаление."""
    ids: list[int]


class BulkDeleteResponse(BaseModel):
    """Ответ на массовое удаление."""
    deleted_count: int


# === Схемы для карты ===

class PlotMapItem(BaseModel):
    """Участок для отображения на карте."""
    id: int
    cadastral_number: str | None
    area: float | None
    address: str | None
    price_public: int | None
    comment: str | None
    status: PlotStatus
    listing_id: int | None
    listing: ListingShort | None = None
    polygon_coords: list[list[float]]  # [[lat, lon], ...]

    class Config:
        from_attributes = True


class PlotClusterItem(BaseModel):
    """Кластер участков для отображения на карте при низком зуме."""
    center: list[float] = Field(description="Центр кластера [lat, lon]")
    count: int = Field(description="Количество участков в кластере")
    unassigned_count: int = Field(0, description="Количество не привязанных к объявлениям")
    assigned_count: int = Field(0, description="Количество привязанных к объявлениям")
    bounds: list[list[float]] = Field(description="Границы кластера [[south, west], [north, east]]")


class PlotMapResponse(BaseModel):
    """Ответ списка участков для карты."""
    items: list[PlotMapItem] = Field(default_factory=list)
    clusters: list[PlotClusterItem] = Field(default_factory=list)
    total: int
    mode: str = Field("plots", description="Режим: 'plots' или 'clusters'")



class BulkAssignRequest(BaseModel):
    """Запрос на массовую привязку участков к объявлению."""
    plot_ids: list[int] = Field(..., min_length=1)
    listing_id: int


class BulkAssignResponse(BaseModel):
    """Ответ на массовую привязку."""
    updated_count: int


# === Схемы для массового импорта ===

class PlotBulkImportItem(BaseModel):
    """Элемент массового импорта участка."""
    cadastral_number: str
    price: int | None = None
    comment: str | None = None


class BulkImportRequest(BaseModel):
    """Запрос массового импорта участков."""
    items: list[PlotBulkImportItem]


class BulkImportResultItem(BaseModel):
    """Результат импорта одного участка."""
    cadastral_number: str
    plot_id: int | None = None
    status: str  # "created", "updated", "error"
    message: str | None = None
    nspd_status: str | None = None  # "success", "error", "skipped"


class BulkImportResponse(BaseModel):
    """Ответ массового импорта."""
    total: int
    created: int
    updated: int
    errors: int
    items: list[BulkImportResultItem]


class BulkUpdateRequest(BaseModel):
    """Запрос массового обновления участков."""
    plot_ids: list[int] = Field(..., min_length=1)
    land_use_id: int | None = None
    land_category_id: int | None = None
    price_public: int | None = None


class BulkUpdateResponse(BaseModel):
    """Ответ на массовое обновление."""
    updated_count: int
