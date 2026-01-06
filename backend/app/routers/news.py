from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import math

from app.database import get_db
from app.models.news import News
from app.schemas.news import (
    NewsCreate,
    NewsUpdate,
    NewsListItem,
    NewsDetail,
    NewsListResponse,
)

router = APIRouter()


@router.get("/", response_model=NewsListResponse)
async def get_news_list(
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(10, ge=1, le=100, description="Размер страницы"),
    db: Session = Depends(get_db),
):
    """Получить список опубликованных новостей с пагинацией."""
    # Считаем общее количество
    total = db.query(News).filter(News.is_published == True).count()
    pages = math.ceil(total / size) if total > 0 else 1
    
    # Получаем новости
    offset = (page - 1) * size
    news_list = (
        db.query(News)
        .filter(News.is_published == True)
        .order_by(desc(News.published_at))
        .offset(offset)
        .limit(size)
        .all()
    )
    
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
    db: Session = Depends(get_db),
):
    """Получить последние N новостей (для главной страницы)."""
    news_list = (
        db.query(News)
        .filter(News.is_published == True)
        .order_by(desc(News.published_at))
        .limit(limit)
        .all()
    )
    return news_list


@router.get("/{slug}", response_model=NewsDetail)
async def get_news_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Получить новость по slug."""
    news = db.query(News).filter(News.slug == slug, News.is_published == True).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Увеличиваем счётчик просмотров
    news.views_count += 1
    db.commit()
    
    
    return news


@router.get("/slugs/all", response_model=list[str])
async def get_all_news_slugs(
    db: Session = Depends(get_db),
):
    """Получить список всех слагов опубликованных новостей (для sitemap)."""
    slugs = (
        db.query(News.slug)
        .filter(News.is_published == True)
        .all()
    )
    return [s[0] for s in slugs if s[0]]


# === Админские эндпоинты (пока без авторизации) ===

@router.post("/", response_model=NewsDetail)
async def create_news(
    news_data: NewsCreate,
    db: Session = Depends(get_db),
):
    """Создать новость."""
    # Проверяем уникальность slug
    existing = db.query(News).filter(News.slug == news_data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Новость с таким slug уже существует")
    
    news = News(**news_data.model_dump())
    db.add(news)
    db.commit()
    db.refresh(news)
    
    return news


@router.put("/{news_id}", response_model=NewsDetail)
async def update_news(
    news_id: int,
    news_data: NewsUpdate,
    db: Session = Depends(get_db),
):
    """Обновить новость."""
    news = db.query(News).filter(News.id == news_id).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Обновляем только переданные поля
    update_data = news_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(news, field, value)
    
    db.commit()
    db.refresh(news)
    
    return news


@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
):
    """Удалить новость."""
    news = db.query(News).filter(News.id == news_id).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    db.delete(news)
    db.commit()
    
    return {"message": "Новость удалена"}
