"""
API для новостей.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.database import get_async_db
from app.models.news import News
from app.schemas.news import (
    NewsCreate,
    NewsUpdate,
    NewsListItem,
    NewsDetail,
    NewsListResponse,
)

router = APIRouter()


# === Публичные endpoints ===

@router.get("/", response_model=NewsListResponse)
async def get_news_list(
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(10, ge=1, le=100, description="Размер страницы"),
    db: AsyncSession = Depends(get_async_db),
):
    """Получить список опубликованных новостей с пагинацией."""
    # Считаем общее количество
    count_result = await db.execute(
        select(func.count(News.id)).where(News.is_published == True)
    )
    total = count_result.scalar() or 0
    pages = math.ceil(total / size) if total > 0 else 1
    
    # Получаем новости
    offset = (page - 1) * size
    result = await db.execute(
        select(News)
        .where(News.is_published == True)
        .order_by(desc(News.published_at))
        .offset(offset)
        .limit(size)
    )
    news_list = result.scalars().all()
    
    return NewsListResponse(
        items=news_list,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/latest", response_model=list[NewsListItem])
async def get_latest_news(
    limit: int = Query(6, ge=1, le=20, description="Количество новостей"),
    db: AsyncSession = Depends(get_async_db),
):
    """Получить последние N новостей (для главной страницы)."""
    result = await db.execute(
        select(News)
        .where(News.is_published == True)
        .order_by(desc(News.published_at))
        .limit(limit)
    )
    news_list = result.scalars().all()
    return news_list


@router.get("/{slug}", response_model=NewsDetail)
async def get_news_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
):
    """Получить новость по slug."""
    result = await db.execute(
        select(News).where(News.slug == slug, News.is_published == True)
    )
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Увеличиваем счётчик просмотров
    news.views_count += 1
    await db.commit()
    
    return news


@router.get("/slugs/all", response_model=list[str])
async def get_all_news_slugs(
    db: AsyncSession = Depends(get_async_db),
):
    """Получить список всех слагов опубликованных новостей (для sitemap)."""
    result = await db.execute(
        select(News.slug).where(News.is_published == True)
    )
    slugs = result.scalars().all()
    return [s for s in slugs if s]


# === Админские эндпоинты (пока без авторизации) ===

@router.post("/", response_model=NewsDetail)
async def create_news(
    news_data: NewsCreate,
    db: AsyncSession = Depends(get_async_db),
):
    """Создать новость."""
    # Проверяем уникальность slug
    result = await db.execute(
        select(News).where(News.slug == news_data.slug)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Новость с таким slug уже существует")
    
    news = News(**news_data.model_dump())
    db.add(news)
    await db.commit()
    await db.refresh(news)
    
    return news


@router.put("/{news_id}", response_model=NewsDetail)
async def update_news(
    news_id: int,
    news_data: NewsUpdate,
    db: AsyncSession = Depends(get_async_db),
):
    """Обновить новость."""
    result = await db.execute(
        select(News).where(News.id == news_id)
    )
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Обновляем только переданные поля
    update_data = news_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(news, field, value)
    
    await db.commit()
    await db.refresh(news)
    
    return news


@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """Удалить новость."""
    result = await db.execute(
        select(News).where(News.id == news_id)
    )
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    await db.delete(news)
    await db.commit()
    
    return {"message": "Новость удалена"}
