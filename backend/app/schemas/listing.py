from datetime import datetime
from pydantic import BaseModel, Field


# === Reference ===

class ReferenceItem(BaseModel):
    """Элемент справочника."""
    id: int
    code: str
    name: str
    
    class Config:
        from_attributes = True


# === Realtor ===

class RealtorItem(BaseModel):
    """Риэлтор (публичная информация)."""
    id: int
    name: str
    phone: str
    company: str | None
    
    class Config:
        from_attributes = True


# === Location ===

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


# === Plot ===

class PlotListItem(BaseModel):
    """Участок в списке объявления."""
    id: int
    cadastral_number: str | None
    area: float | None  # м²
    address: str | None
    price_public: int | None
    price_per_sotka: int | None
    status: str
    land_use: ReferenceItem | None
    land_category: ReferenceItem | None
    
    class Config:
        from_attributes = True


# === Listing ===

class ListingListItem(BaseModel):
    """Объявление в списке (краткое)."""
    id: int
    slug: str
    title: str
    price_min: int | None
    price_max: int | None
    total_area: float | None  # м²
    plots_count: int
    is_featured: bool
    realtor: RealtorItem
    settlement: SettlementItem | None = None
    
    class Config:
        from_attributes = True


class ListingDetail(BaseModel):
    """Объявление (полное)."""
    id: int
    slug: str
    title: str
    description: str | None
    price_min: int | None
    price_max: int | None
    total_area: float | None
    plots_count: int
    realtor: RealtorItem
    plots: list[PlotListItem]
    meta_title: str | None
    meta_description: str | None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    """Ответ со списком объявлений."""
    items: list[ListingListItem]
    total: int
    page: int
    size: int
    pages: int
