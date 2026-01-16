"""
Публичный API для работы с участками.
Возвращает все активные участки для клиентской кластеризации.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_X, ST_Y

from app.database import get_db
from app.models.plot import Plot, PlotStatus
from app.schemas.public_plot import PlotAllResponse, PlotPoint


router = APIRouter()


@router.get("/all", response_model=PlotAllResponse)
async def get_all_plots(
    # Опциональные фильтры для карты
    district_id: int | None = Query(None, description="ID района"),
    settlements: str | None = Query(None, description="Список ID населённых пунктов через запятую"),
    land_use_id: int | None = Query(None, description="ID разрешённого использования"),
    price_min: int | None = Query(None, description="Минимальная цена"),
    price_max: int | None = Query(None, description="Максимальная цена"),
    area_min: float | None = Query(None, description="Минимальная площадь (м²)"),
    area_max: float | None = Query(None, description="Максимальная площадь (м²)"),
    db: Session = Depends(get_db),
):
    """
    Получить все активные участки для отображения на карте.
    Кластеризация выполняется на клиенте через Leaflet.markercluster.
    """
    from app.models.listing import Listing
    from app.models.location import Settlement
    
    query = db.query(
        Plot.id,
        ST_Y(Plot.centroid).label('lat'),
        ST_X(Plot.centroid).label('lon'),
        Plot.price_public.label('price'),
        Listing.slug.label('listing_slug'),
        Listing.title.label('title'),
    ).join(
        Listing, Plot.listing_id == Listing.id
    ).filter(
        Plot.status == PlotStatus.active,
        Plot.centroid.isnot(None),
        Listing.is_published == True
    )
    
    # Фильтры по местоположению
    if district_id:
        query = query.join(Settlement, Listing.settlement_id == Settlement.id).filter(
            Settlement.district_id == district_id
        )
    
    if settlements:
        settlement_ids = [int(s.strip()) for s in settlements.split(",") if s.strip().isdigit()]
        if settlement_ids:
            query = query.filter(Listing.settlement_id.in_(settlement_ids))
    
    # Фильтры по характеристикам участков
    if land_use_id:
        query = query.filter(Plot.land_use_id == land_use_id)
    if price_min:
        query = query.filter(Plot.price_public >= price_min)
    if price_max:
        query = query.filter(Plot.price_public <= price_max)
    if area_min:
        query = query.filter(Plot.area >= area_min)
    if area_max:
        query = query.filter(Plot.area <= area_max)
    
    plots = query.all()
    
    return PlotAllResponse(
        plots=[
            PlotPoint(
                id=p.id,
                lat=p.lat,
                lon=p.lon,
                price=p.price,
                listing_slug=p.listing_slug,
                title=p.title,
            )
            for p in plots
        ],
        total=len(plots)
    )


@router.get("/count")
async def get_active_plots_count(
    db: Session = Depends(get_db),
):
    """
    Получить общее количество активных участков.
    
    Учитываются только участки со статусом 'active',
    привязанные к опубликованным объявлениям.
    """
    from app.models.listing import Listing
    
    count = db.query(func.count(Plot.id)).join(
        Listing, Plot.listing_id == Listing.id
    ).filter(
        Plot.status == PlotStatus.active,
        Listing.is_published == True
    ).scalar()
    
    return {"count": count or 0}
