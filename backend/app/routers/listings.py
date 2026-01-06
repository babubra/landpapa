from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import math

from app.database import get_db
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.schemas.listing import (
    ListingListItem,
    ListingDetail,
    ListingListResponse,
)

router = APIRouter()


@router.get("/", response_model=ListingListResponse)
async def get_listings(
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    # Локация
    district_id: int | None = Query(None, description="ID района"),
    settlement_id: int | None = Query(None, description="ID населённого пункта (устаревший, используйте settlements)"),
    settlements: str | None = Query(None, description="Список ID населённых пунктов через запятую"),
    # Характеристики
    land_use_id: int | None = Query(None, description="ID разрешённого использования"),
    price_min: int | None = Query(None, description="Минимальная цена"),
    price_max: int | None = Query(None, description="Максимальная цена"),
    area_min: float | None = Query(None, description="Минимальная площадь (м²)"),
    area_max: float | None = Query(None, description="Максимальная площадь (м²)"),
    # Сортировка
    sort: str = Query("newest", description="newest | price_asc | price_desc"),
    db: Session = Depends(get_db),
):
    """Получить список опубликованных объявлений с фильтрацией."""
    from app.models.location import Settlement
    
    # Подзапрос для фильтрации объявлений с активными участками
    active_plots_query = db.query(Plot).filter(Plot.status == PlotStatus.active)
    
    # Фильтры по характеристикам участков
    if land_use_id:
        active_plots_query = active_plots_query.filter(Plot.land_use_id == land_use_id)
    if price_min:
        active_plots_query = active_plots_query.filter(Plot.price_public >= price_min)
    if price_max:
        active_plots_query = active_plots_query.filter(Plot.price_public <= price_max)
    if area_min:
        active_plots_query = active_plots_query.filter(Plot.area >= area_min)
    if area_max:
        active_plots_query = active_plots_query.filter(Plot.area <= area_max)
    
    active_listings_ids = active_plots_query.with_entities(Plot.listing_id).distinct().subquery()
    
    # Основной запрос
    query = (
        db.query(Listing)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listings_ids))
    )
    
    # Фильтры по локации
    # Приоритет: settlements (новый) > settlement_id (старый) > district_id
    if settlements:
        # Парсим список ID из строки "7,8,9"
        settlement_ids = [int(s.strip()) for s in settlements.split(",") if s.strip().isdigit()]
        if settlement_ids:
            query = query.filter(Listing.settlement_id.in_(settlement_ids))
    elif settlement_id:
        query = query.filter(Listing.settlement_id == settlement_id)
    elif district_id:
        query = query.join(Settlement).filter(Settlement.district_id == district_id)
    
    # Считаем общее количество
    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    # Сортировка
    if sort == "price_asc":
        # Сортировка по минимальной цене - сложно, используем created_at как fallback
        query = query.order_by(Listing.created_at)
    elif sort == "price_desc":
        query = query.order_by(desc(Listing.created_at))
    else:  # newest
        query = query.order_by(desc(Listing.created_at))
    
    listings = query.offset(offset).limit(size).all()
    
    return ListingListResponse(
        items=listings,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/popular", response_model=list[ListingListItem])
async def get_popular_listings(
    limit: int = Query(4, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Получить популярные объявления (специальные предложения)."""
    active_listings_ids = (
        db.query(Plot.listing_id)
        .filter(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )
    
    # Сначала featured, затем по дате создания
    listings = (
        db.query(Listing)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listings_ids))
        .order_by(desc(Listing.is_featured), desc(Listing.created_at))
        .limit(limit)
        .all()
    )
    
    return listings


@router.get("/{slug}", response_model=ListingDetail)
async def get_listing_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Получить объявление по slug."""
    listing = (
        db.query(Listing)
        .filter(Listing.slug == slug, Listing.is_published == True)
        .first()
    )
    
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    return listing


@router.get("/slugs/all", response_model=list[str])
async def get_all_slugs(
    db: Session = Depends(get_db),
):
    """Получить список всех слагов опубликованных объявлений (для sitemap)."""
    slugs = (
        db.query(Listing.slug)
        .filter(Listing.is_published == True)
        .all()
    )
    # slugs возвращается как список кортежей [('item-1',), ('item-2',)]
    return [s[0] for s in slugs if s[0]]
