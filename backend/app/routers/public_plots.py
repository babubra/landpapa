"""
Публичный API для работы с участками.
Возвращает все активные участки для клиентской кластеризации.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_X, ST_Y

from sqlalchemy.orm import aliased

from app.database import get_async_db
from app.models.plot import Plot, PlotStatus
from app.models.listing import Listing
from app.models.location import Settlement
from app.schemas.public_plot import PlotAllResponse, PlotPoint


router = APIRouter()


@router.get("/all", response_model=PlotAllResponse)
async def get_all_plots(
    # Опциональные фильтры для карты
    location_id: int | None = Query(None, description="ID локации (новая иерархия)"),
    district_id: int | None = Query(None, description="ID района (deprecated)"),
    settlements: str | None = Query(None, description="Список ID населённых пунктов через запятую"),
    land_use_id: int | None = Query(None, description="ID разрешённого использования"),
    price_min: int | None = Query(None, description="Минимальная цена"),
    price_max: int | None = Query(None, description="Максимальная цена"),
    area_min: float | None = Query(None, description="Минимальная площадь (м²)"),
    area_max: float | None = Query(None, description="Максимальная площадь (м²)"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Получить все активные участки для отображения на карте.
    Кластеризация выполняется на клиенте через Leaflet.markercluster.
    """
    from app.models.location import Location
    
    # Вспомогательная функция для получения всех дочерних ID локации
    # Используем CTE для оптимизации
    async def get_descendant_ids(loc_id: int) -> list[int]:
        cte = select(Location.id).where(Location.id == loc_id).cte("location_tree", recursive=True)
        cte = cte.union_all(
            select(Location.id).join(cte, Location.parent_id == cte.c.id)
        )
        result = await db.execute(select(cte.c.id))
        return result.scalars().all()
    
    ParentLocation = aliased(Location)

    # Базовый запрос
    query = (
        select(
            Plot.id,
            ST_Y(Plot.centroid).label('lat'),
            ST_X(Plot.centroid).label('lon'),
            Plot.price_public.label('price'),
            Listing.slug.label('listing_slug'),
            Listing.title.label('title'),
            Location.slug.label('location_slug'),
            ParentLocation.slug.label('location_parent_slug'),
            Location.type.label('location_type'),
        )
        .join(Listing, Plot.listing_id == Listing.id)
        .outerjoin(Location, Listing.location_id == Location.id)
        .outerjoin(ParentLocation, Location.parent_id == ParentLocation.id)
        .where(
            Plot.status == PlotStatus.active,
            Plot.centroid.isnot(None),
            Listing.is_published == True
        )
    )
    
    # Приоритет: location_id > settlements > district_id
    if location_id:
        all_location_ids = await get_descendant_ids(location_id)
        query = query.where(Listing.location_id.in_(all_location_ids))
    elif settlements:
        settlement_ids = [int(s.strip()) for s in settlements.split(",") if s.strip().isdigit()]
        if settlement_ids:
            query = query.where(Listing.settlement_id.in_(settlement_ids))
    elif district_id:
        query = query.join(Settlement, Listing.settlement_id == Settlement.id).where(
            Settlement.district_id == district_id
        )

    if land_use_id:
        query = query.where(Plot.land_use_id == land_use_id)
    if price_min:
        query = query.where(Plot.price_public >= price_min)
    if price_max:
        query = query.where(Plot.price_public <= price_max)
    if area_min:
        query = query.where(Plot.area >= area_min)
    if area_max:
        query = query.where(Plot.area <= area_max)
    
    result = await db.execute(query)
    plots = result.all()
    
    return PlotAllResponse(
        plots=[
            PlotPoint(
                id=p.id,
                lat=p.lat,
                lon=p.lon,
                price=p.price,
                listing_slug=p.listing_slug,
                title=p.title,
                location_slug=p.location_slug,
                location_parent_slug=p.location_parent_slug,
                location_type=p.location_type,
            )
            for p in plots
        ],
        total=len(plots)
    )


@router.get("/count")
async def get_active_plots_count(
    # Опциональные фильтры
    location_id: int | None = Query(None, description="ID локации (новая иерархия)"),
    settlements: str | None = Query(None, description="Список ID населённых пунктов через запятую"),
    land_use: int | None = Query(None, alias="land_use", description="ID разрешённого использования"),
    price_min: int | None = Query(None, description="Минимальная цена"),
    price_max: int | None = Query(None, description="Максимальная цена"),
    area_min: float | None = Query(None, description="Минимальная площадь (м²)"),
    area_max: float | None = Query(None, description="Максимальная площадь (м²)"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Получить количество активных участков с учётом фильтров.
    
    Учитываются только участки со статусом 'active',
    привязанные к опубликованным объявлениям.
    """
    from app.models.location import Location
    
    # Вспомогательная функция для получения всех дочерних ID локации
    async def get_descendant_ids(parent_id: int) -> list[int]:
        """Получает все ID потомков (включая саму локацию)."""
        ids = [parent_id]
        result = await db.execute(
            select(Location.id).where(Location.parent_id == parent_id)
        )
        child_ids = [row[0] for row in result.all()]
        for child_id in child_ids:
            ids.extend(await get_descendant_ids(child_id))
        return ids
    
    query = (
        select(func.count(Plot.id))
        .join(Listing, Plot.listing_id == Listing.id)
        .where(
            Plot.status == PlotStatus.active,
            Listing.is_published == True
        )
    )
    
    # Приоритет: location_id > settlements
    if location_id:
        all_location_ids = await get_descendant_ids(location_id)
        query = query.where(Listing.location_id.in_(all_location_ids))
    elif settlements:
        settlement_ids = [int(s.strip()) for s in settlements.split(",") if s.strip().isdigit()]
        if settlement_ids:
            query = query.where(Listing.settlement_id.in_(settlement_ids))
    
    # Фильтры по характеристикам участков
    if land_use:
        query = query.where(Plot.land_use_id == land_use)
    if price_min:
        query = query.where(Plot.price_public >= price_min)
    if price_max:
        query = query.where(Plot.price_public <= price_max)
    if area_min:
        query = query.where(Plot.area >= area_min)
    if area_max:
        query = query.where(Plot.area <= area_max)
    
    result = await db.execute(query)
    count = result.scalar()
    
    return {"count": count or 0}

