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
    title: str

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
