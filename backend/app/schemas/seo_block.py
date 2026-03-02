"""
Pydantic-схемы для SEO-блоков.
"""

from pydantic import BaseModel
from app.schemas.listing import ListingListItem


# === Публичный API ===

class SeoBlockPublic(BaseModel):
    """SEO-блок с подобранными листингами (для фронтенда)."""
    id: int
    title: str
    subtitle: str | None = None
    description: str | None = None
    link_url: str
    listings: list[ListingListItem] = []

    class Config:
        from_attributes = True


# === Админский API ===

class SeoBlockLocationInfo(BaseModel):
    """Краткая информация о локации (для отображения в админке)."""
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


class SeoBlockAdmin(BaseModel):
    """SEO-блок для админки (все поля)."""
    id: int
    title: str
    subtitle: str | None = None
    description: str | None = None
    link_url: str
    location_id: int | None = None
    location: SeoBlockLocationInfo | None = None
    land_use_filter: str | None = None
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class SeoBlockCreate(BaseModel):
    """Создание SEO-блока."""
    title: str
    subtitle: str | None = None
    description: str | None = None
    link_url: str
    location_id: int | None = None
    land_use_filter: str | None = None
    sort_order: int = 0
    is_active: bool = True


class SeoBlockUpdate(BaseModel):
    """Обновление SEO-блока (все поля опциональны)."""
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    link_url: str | None = None
    location_id: int | None = None
    land_use_filter: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
