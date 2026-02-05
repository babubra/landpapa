"""
Публичный API для объявлений.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.database import get_async_db
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.models.location import Settlement, District, Location
from app.schemas.listing import (
    ListingListItem,
    ListingDetail,
    ListingListResponse,
    ListingSitemapItem,
)

router = APIRouter()


@router.get("/", response_model=ListingListResponse)
async def get_listings(
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    # Локация (новая иерархия)
    location_id: int | None = Query(None, description="ID локации (новая иерархия)"),
    # Локация (старая)
    district_id: int | None = Query(None, description="ID района (устаревший)"),
    settlement_id: int | None = Query(None, description="ID населённого пункта (устаревший)"),
    settlements: str | None = Query(None, description="Список ID населённых пунктов через запятую"),
    # Характеристики
    land_use_id: int | None = Query(None, description="ID разрешённого использования"),
    price_min: int | None = Query(None, description="Минимальная цена"),
    price_max: int | None = Query(None, description="Максимальная цена"),
    area_min: float | None = Query(None, description="Минимальная площадь (м²)"),
    area_max: float | None = Query(None, description="Максимальная площадь (м²)"),
    # Сортировка
    sort: str = Query("newest", description="newest | price_asc | price_desc"),
    db: AsyncSession = Depends(get_async_db),
):
    """Получить список опубликованных объявлений с фильтрацией."""
    
    # Подзапрос для фильтрации объявлений с активными участками
    active_plots_query = select(Plot.listing_id).where(Plot.status == PlotStatus.active)
    
    # Фильтры по характеристикам участков
    if land_use_id:
        active_plots_query = active_plots_query.where(Plot.land_use_id == land_use_id)
    if price_min:
        active_plots_query = active_plots_query.where(Plot.price_public >= price_min)
    if price_max:
        active_plots_query = active_plots_query.where(Plot.price_public <= price_max)
    if area_min:
        active_plots_query = active_plots_query.where(Plot.area >= area_min)
    if area_max:
        active_plots_query = active_plots_query.where(Plot.area <= area_max)
    
    active_listings_ids = active_plots_query.distinct().subquery()
    
    # Основной запрос
    query = (
        select(Listing)
        .options(
            selectinload(Listing.settlement).selectinload(Settlement.district),
            selectinload(Listing.location).selectinload(Location.parent)
        )
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listings_ids.c.listing_id)))
    )
    
    # Фильтры по локации
    # Приоритет: location_id (новая иерархия) > settlements > settlement_id > district_id
    # Фильтры по локации
    # Приоритет: location_id (новая иерархия) > settlements > settlement_id > district_id
    if location_id:
        # Используем рекурсивный CTE для получения всех ID потомков
        # WITH RECURSIVE location_tree AS (
        #     SELECT id FROM locations WHERE id = :location_id
        #     UNION ALL
        #     SELECT l.id FROM locations l
        #     JOIN location_tree lt ON l.parent_id = lt.id
        # )
        # SELECT id FROM location_tree;
        
        # SQLAlchemy CTE
        cte = select(Location.id).where(Location.id == location_id).cte("location_tree", recursive=True)
        cte = cte.union_all(
            select(Location.id).join(cte, Location.parent_id == cte.c.id)
        )
        
        # Подзапрос всех ID
        all_location_ids_query = select(cte.c.id)
        query = query.where(Listing.location_id.in_(all_location_ids_query))
        
    elif settlements:
        # Парсим список ID из строки "7,8,9"
        settlement_ids = [int(s.strip()) for s in settlements.split(",") if s.strip().isdigit()]
        if settlement_ids:
            query = query.where(Listing.settlement_id.in_(settlement_ids))
    elif settlement_id:
        query = query.where(Listing.settlement_id == settlement_id)
    elif district_id:
        query = query.join(Settlement).where(Settlement.district_id == district_id)
    
    # Считаем общее количество
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    # Сортировка
    if sort == "price_asc":
        query = query.order_by(Listing.price_min)
    elif sort == "price_desc":
        query = query.order_by(desc(Listing.price_min))
    else:  # newest
        query = query.order_by(desc(Listing.created_at))
    
    # Пагинация и выполнение
    query = query.offset(offset).limit(size)
    result = await db.execute(query)
    listings = result.scalars().all()
    
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
    db: AsyncSession = Depends(get_async_db),
):
    """Получить популярные объявления (специальные предложения)."""
    # Подзапрос для активных участков
    active_listings_ids = (
        select(Plot.listing_id)
        .where(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )
    
    # Сначала featured, затем по дате создания
    query = (
        select(Listing)
        .options(selectinload(Listing.location).selectinload(Location.parent))
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listings_ids.c.listing_id)))
        .order_by(desc(Listing.is_featured), desc(Listing.created_at))
        .limit(limit)
    )
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    return listings


@router.get("/{slug}", response_model=ListingDetail)
async def get_listing_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
):
    """Получить объявление по slug."""
    result = await db.execute(
        select(Listing)
        .options(
            selectinload(Listing.settlement).selectinload(Settlement.district),
            selectinload(Listing.location).selectinload(Location.parent)
        )
        .where(Listing.slug == slug, Listing.is_published == True)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    return listing


@router.get("/slugs/all", response_model=list[ListingSitemapItem])
async def get_all_slugs(
    db: AsyncSession = Depends(get_async_db),
):
    """Получить список всех слагов опубликованных объявлений (для sitemap)."""
    
    # Получаем все опубликованные листинги с их location и старыми полями
    query = (
        select(
            Listing.slug, 
            Listing.updated_at,
            Listing.location_id,
            Settlement.slug.label("settlement_slug"),
            District.slug.label("district_slug")
        )
        .outerjoin(Settlement, Listing.settlement_id == Settlement.id)
        .outerjoin(District, Settlement.district_id == District.id)
        .where(Listing.is_published == True)
    )
    
    result = await db.execute(query)
    
    # Собираем все location_id для пакетного получения путей
    rows = result.all()
    location_ids = {row.location_id for row in rows if row.location_id}
    
    # Получаем пути для всех локаций сразу
    location_paths: dict[int, list[str]] = {}
    if location_ids:
        # Для каждой локации строим путь от неё до корня
        for loc_id in location_ids:
            path: list[str] = []
            current_id = loc_id
            
            # Защита от бесконечного цикла
            max_depth = 10
            while current_id and max_depth > 0:
                loc_result = await db.execute(
                    select(Location.slug, Location.parent_id, Location.type)
                    .where(Location.id == current_id)
                )
                loc = loc_result.first()
                if not loc:
                    break
                    
                # Регион не включаем в URL
                if loc.type != "region":
                    path.insert(0, loc.slug)
                    
                current_id = loc.parent_id
                max_depth -= 1
            
            if path:
                location_paths[loc_id] = path
    
    # Формируем ответ
    items = []
    for row in rows:
        location_path = location_paths.get(row.location_id) if row.location_id else None
        
        items.append(ListingSitemapItem(
            slug=row.slug,
            updated_at=row.updated_at,
            location_path=location_path,
            settlement_slug=row.settlement_slug,
            district_slug=row.district_slug
        ))
        
    return items
