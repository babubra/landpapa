from datetime import datetime
from pydantic import BaseModel, Field


class NewsBase(BaseModel):
    """Базовые поля новости."""
    title: str = Field(..., min_length=1, max_length=500)
    slug: str = Field(..., min_length=1, max_length=255)
    excerpt: str = Field(..., min_length=1, description="Краткое описание")
    content: str = Field(..., min_length=1, description="HTML контент")
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = None


class NewsCreate(NewsBase):
    """Схема для создания новости."""
    is_published: bool = False
    published_at: datetime | None = None


class NewsUpdate(BaseModel):
    """Схема для обновления новости (все поля опциональные)."""
    title: str | None = Field(None, min_length=1, max_length=500)
    slug: str | None = Field(None, min_length=1, max_length=255)
    excerpt: str | None = None
    content: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    is_published: bool | None = None
    published_at: datetime | None = None


class NewsListItem(BaseModel):
    """Схема для списка новостей (краткая)."""
    id: int
    slug: str
    title: str
    excerpt: str
    published_at: datetime | None
    views_count: int

    class Config:
        from_attributes = True


class NewsDetail(NewsListItem):
    """Схема для детальной страницы новости."""
    content: str
    meta_title: str | None
    meta_description: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    """Ответ со списком новостей и пагинацией."""
    items: list[NewsListItem]
    total: int
    page: int
    size: int
    pages: int
