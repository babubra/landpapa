"""
Публичный API для работы с участками (viewport-based загрузка).
Серверная кластеризация через ST_SnapToGrid.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_MakeEnvelope, ST_Intersects, ST_SnapToGrid, ST_X, ST_Y

from app.database import get_db
from app.models.plot import Plot, PlotStatus
from app.schemas.public_plot import PlotViewportResponse, MapMarkerItem


router = APIRouter()


# Размер ячейки сетки для каждого уровня зума
# Чем выше zoom — тем меньше ячейка (точнее группировка)
# Чем больше значение — тем агрессивнее кластеризация
GRID_SIZES = {
    7: 1.5,
    8: 0.8,
    9: 0.4,
    10: 0.2,
    11: 0.1,
    12: 0.1,   # Увеличено с 0.05 для объединения близких кластеров
}


def get_grid_size(zoom: int) -> float:
    """Получить размер ячейки сетки для кластеризации."""
    if zoom >= 13:
        return 0.00001  # Практически нет кластеров — показываем пины
    return GRID_SIZES.get(zoom, 1.0)


@router.get("/viewport", response_model=PlotViewportResponse)
async def get_plots_in_viewport(
    # Границы viewport
    north: float = Query(..., description="Северная граница (latitude)", ge=-90, le=90),
    south: float = Query(..., description="Южная граница (latitude)", ge=-90, le=90),
    east: float = Query(..., description="Восточная граница (longitude)", ge=-180, le=180),
    west: float = Query(..., description="Западная граница (longitude)", ge=-180, le=180),
    zoom: int = Query(..., description="Уровень зума карты", ge=1, le=20),
    # Фильтры (аналогично каталогу)
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
    Получить маркеры (точки и кластеры) для отображения на карте.
    
    Использует серверную кластеризацию через ST_SnapToGrid.
    При высоком зуме (13+) возвращает одиночные точки.
    При низком зуме — кластеры с count > 1.
    """
    from app.models.listing import Listing
    from app.models.location import Settlement
    
    # Создаём envelope для viewport (SRID 4326 = WGS84)
    viewport_envelope = ST_MakeEnvelope(west, south, east, north, 4326)
    
    # Размер ячейки сетки для кластеризации
    grid_size = get_grid_size(zoom)
    
    # Snap-точка для группировки
    snapped = ST_SnapToGrid(Plot.centroid, grid_size)
    
    # Базовый запрос с агрегацией
    query = db.query(
        func.array_agg(Plot.id).label('ids'),
        func.array_agg(Plot.price_public).label('prices'),
        func.array_agg(Listing.slug).label('slugs'),
        func.count().label('count'),
        # Центр группы — среднее арифметическое центроидов
        func.avg(ST_X(Plot.centroid)).label('lon'),
        func.avg(ST_Y(Plot.centroid)).label('lat'),
        # Границы группы (для zoom кластера)
        func.min(ST_Y(Plot.centroid)).label('lat_min'),
        func.max(ST_Y(Plot.centroid)).label('lat_max'),
        func.min(ST_X(Plot.centroid)).label('lon_min'),
        func.max(ST_X(Plot.centroid)).label('lon_max'),
    ).join(
        Listing, Plot.listing_id == Listing.id
    ).filter(
        Plot.status == PlotStatus.active,
        Plot.centroid.isnot(None),
        Listing.is_published == True,
        ST_Intersects(Plot.centroid, viewport_envelope)
    )
    
    # Фильтры по местоположению (через связанные объявления)
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
    
    # Группировка по snap-точке
    query = query.group_by(snapped)
    
    # Формируем маркеры
    markers = []
    total_count = 0
    
    for row in query.all():
        total_count += row.count
        
        if row.count == 1:
            # Одиночная точка
            markers.append(MapMarkerItem(
                type="point",
                id=str(row.ids[0]),
                lat=row.lat,
                lon=row.lon,
                count=1,
                price=row.prices[0] if row.prices else None,
                listing_slug=row.slugs[0] if row.slugs else None,
            ))
        else:
            # Кластер
            markers.append(MapMarkerItem(
                type="cluster",
                id=",".join(map(str, row.ids)),
                lat=row.lat,
                lon=row.lon,
                count=row.count,
                bounds=[[row.lat_min, row.lon_min], [row.lat_max, row.lon_max]],
            ))
    
    return PlotViewportResponse(
        zoom=zoom,
        markers=markers,
        total_in_viewport=total_count
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
