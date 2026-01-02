"""
Pydantic схемы для админского API объявлений.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# === Reference Schemas ===

class ReferenceItem(BaseModel):
    """Элемент справочника."""
    id: int
    code: str
    name: str
    
    class Config:
        from_attributes = True


# === Realtor Schemas ===

class RealtorItem(BaseModel):
    """Риэлтор (краткая информация)."""
    id: int
    name: str
    phone: str
    company: str | None = None
    
    class Config:
        from_attributes = True


# === Location Schemas ===

class DistrictItem(BaseModel):
    """Район."""
    id: int
    name: str
    slug: str
    
    class Config:
        from_attributes = True


class SettlementItem(BaseModel):
    """Населённый пункт."""
    id: int
    name: str
    slug: str
    district: DistrictItem | None = None
    
    class Config:
        from_attributes = True


# === Plot Schemas ===

class PlotShortItem(BaseModel):
    """Участок (краткая информация для списка в объявлении)."""
    id: int
    cadastral_number: str | None = None
    area: float | None = None
    address: str | None = None
    price_public: int | None = None
    status: str
    land_use: ReferenceItem | None = None
    
    class Config:
        from_attributes = True


# === Listing Schemas ===

class ListingAdminListItem(BaseModel):
    """Объявление в списке (для таблицы)."""
    id: int
    slug: str
    title: str
    cadastral_numbers: list[str] = []  # Кадастровые номера привязанных участков
    is_published: bool
    is_featured: bool
    settlement: SettlementItem | None = None
    realtor: RealtorItem
    plots_count: int
    total_area: float | None = None
    price_min: int | None = None
    price_max: int | None = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ListingAdminDetail(BaseModel):
    """Объявление (полная информация для формы)."""
    id: int
    slug: str
    title: str
    description: str | None = None
    is_published: bool
    is_featured: bool
    settlement_id: int | None = None
    settlement: SettlementItem | None = None
    realtor_id: int
    realtor: RealtorItem
    meta_title: str | None = None
    meta_description: str | None = None
    plots: list[PlotShortItem] = []
    plots_count: int
    total_area: float | None = None
    price_min: int | None = None
    price_max: int | None = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ListingCreate(BaseModel):
    """Создание объявления. Slug генерируется автоматически из title."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    realtor_id: int
    settlement_id: int | None = None
    is_published: bool = False
    is_featured: bool = False
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = None
    plot_ids: list[int] = []  # ID участков для привязки


class ListingUpdate(BaseModel):
    """Обновление объявления. Slug обновляется автоматически при изменении title."""
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    realtor_id: int | None = None
    settlement_id: int | None = None
    is_published: bool | None = None
    is_featured: bool | None = None
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = None
    plot_ids: list[int] | None = None  # ID участков для привязки


class ListingListResponse(BaseModel):
    """Ответ со списком объявлений."""
    items: list[ListingAdminListItem]
    total: int
    page: int
    size: int
    pages: int


# === Bulk Operations ===

class BulkDeleteRequest(BaseModel):
    """Запрос на массовое удаление."""
    ids: list[int]


class BulkDeleteResponse(BaseModel):
    """Ответ на массовое удаление."""
    deleted_count: int
