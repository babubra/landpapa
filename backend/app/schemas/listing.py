from datetime import datetime
from pydantic import BaseModel, Field, computed_field
from app.utils.title_generator import generate_seo_title
from app.schemas.image import ImageItem


# === Reference ===

class SeoObject(BaseModel):
    title: str          # Итоговый Title (эффективный)
    description: str | None = None    # Итоговый Description
    h1: str             # Заголовок страницы (из базы)
    canonical: str | None = None      # Канонический URL
    robots: str = "index, follow"
    og_image: str | None = None
    
    # Источники (для отладки)
    auto_title: str | None = None

class ReferenceItem(BaseModel):
    """Элемент справочника."""
    id: int
    code: str
    name: str
    
    class Config:
        from_attributes = True


class ListingSitemapItem(BaseModel):
    """Данные для sitemap."""
    slug: str
    updated_at: datetime
    settlement_slug: str | None = None
    district_slug: str | None = None

    class Config:
        from_attributes = True


# === Realtor ===

class RealtorItem(BaseModel):
    """Риэлтор (публичная информация)."""
    id: int
    name: str
    phone: str
    
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
    type: str | None = None  # "г", "пос", "с" и т.д.
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
    # Геоданные
    latitude: float | None = None      # Центроид — широта
    longitude: float | None = None     # Центроид — долгота
    polygon: list[list[float]] | None = Field(default=None, validation_alias="polygon_coords")
    
    class Config:
        from_attributes = True
        populate_by_name = True


# === Listing ===

class ListingListItem(BaseModel):
    """Объявление в списке (краткое)."""
    id: int
    slug: str
    title: str
    price_min: int | None
    price_max: int | None
    total_area: float | None  # м²
    area_min: float | None = None  # Минимальная площадь участка
    area_max: float | None = None  # Максимальная площадь участка
    plots_count: int
    is_featured: bool
    realtor: RealtorItem
    settlement: SettlementItem | None = None
    image: ImageItem | None = Field(default=None, validation_alias="main_image")
    # Координаты для карты (все участки)
    coordinates: list[list[float]] = []  # [[lat, lon], [lat, lon], ...]
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ListingDetail(BaseModel):
    """Объявление (полное)."""
    id: int
    slug: str
    title: str
    description: str | None
    price_min: int | None
    price_max: int | None
    total_area: float | None
    area_min: float | None = None  # Минимальная площадь участка
    area_max: float | None = None  # Максимальная площадь участка
    plots_count: int
    realtor: RealtorItem
    settlement: SettlementItem | None = None  # Гео-информация для URL
    plots: list[PlotListItem] = Field(default=[], validation_alias="viewable_plots")
    images: list[ImageItem] = []
    meta_title: str | None
    meta_description: str | None
    created_at: datetime
    
    @computed_field
    @property
    def seo(self) -> SeoObject:
        # 1. Title
        auto_title = generate_seo_title(self)
        effective_title = self.meta_title if self.meta_title else auto_title
        
        # 2. Description
        description = self.meta_description if self.meta_description else (self.description[:160] if self.description else None)
        
        # 3. Canonical
        # Формируем абсолютный URL.
        # Базовый URL лучше брать из конфига, пока хардкодим или берем из env
        # Предполагаем, что slug уникален и достаточен
        site_url = "https://rkkland.ru" # TODO: вынести в config
        canonical_url = f"{site_url}/listing/{self.slug}"

        return SeoObject(
            title=effective_title,
            description=description,
            h1=self.title,
            canonical=canonical_url,
            robots="index, follow",
            auto_title=auto_title
        )

    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    """Ответ со списком объявлений."""
    items: list[ListingListItem]
    total: int
    page: int
    size: int
    pages: int

