"""
Публичный API для работы с участками (viewport-based загрузка).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from geoalchemy2.shape import to_shape
from geoalchemy2.functions import ST_MakeEnvelope, ST_Intersects

from app.database import get_db
from app.models.plot import Plot, PlotStatus
from app.schemas.public_plot import PlotViewportResponse, PlotViewportItem, ClusterItem


router = APIRouter()


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
    Получить участки или кластеры в пределах viewport.
    
    - При zoom < 13: возвращает кластеры
    - При zoom >= 13: возвращает полигоны участков
    
    Применяет фильтры из каталога для согласованности данных.
    """
    from app.models.listing import Listing
    from app.models.location import Settlement
    
    # Создаём envelope для viewport (SRID 4326 = WGS84)
    viewport_envelope = ST_MakeEnvelope(west, south, east, north, 4326)
    
    # Базовый запрос: только активные участки с геометрией
    query = db.query(Plot).filter(
        Plot.status == PlotStatus.active,
        Plot.polygon.isnot(None),
        ST_Intersects(Plot.polygon, viewport_envelope)
    )
    
    # Применяем фильтры через связанные объявления
    if district_id or settlements or land_use_id:
        query = query.join(Listing, Plot.listing_id == Listing.id).filter(
            Listing.is_published == True
        )
        
        if district_id:
            query = query.join(Settlement).filter(Settlement.district_id == district_id)
        
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
    
    # Подсчёт общего количества
    total_count = query.count()
    
    # Выбираем режим отображения по уровню зума
    CLUSTER_ZOOM_THRESHOLD = 13
    
    if zoom < CLUSTER_ZOOM_THRESHOLD:
        # Режим кластеров: группируем участки по сетке
        clusters = _generate_clusters(query, viewport_envelope, zoom)
        return PlotViewportResponse(
            zoom=zoom,
            plots=[],
            clusters=clusters,
            total_in_viewport=total_count
        )
    else:
        # Режим полигонов: возвращаем участки
        plots = query.limit(1000).all()  # Лимит для безопасности
        
        plot_items = []
        for plot in plots:
            try:
                poly = to_shape(plot.polygon)
                coords = list(poly.exterior.coords)
                polygon_coords = [[coord[1], coord[0]] for coord in coords]  # [lat, lon]
                
                plot_items.append(PlotViewportItem(
                    id=plot.id,
                    cadastral_number=plot.cadastral_number,
                    area=plot.area,
                    price_public=plot.price_public,
                    status=plot.status,
                    polygon_coords=polygon_coords,
                    listing_id=plot.listing_id,
                ))
            except Exception:
                # Пропускаем участки с невалидной геометрией
                continue
        
        return PlotViewportResponse(
            zoom=zoom,
            plots=plot_items,
            clusters=[],
            total_in_viewport=total_count
        )


def _generate_clusters(query, viewport_envelope, zoom: int) -> list[ClusterItem]:
    """
    Генерация кластеров участков для низких зумов.
    
    Использует простую сеточную кластеризацию на основе центроидов.
    """
    # Размер сетки зависит от зума (чем выше зум, тем меньше ячейки)
    grid_size = 0.5 / (2 ** (zoom - 8))  # Примерная формула
    
    plots = query.all()
    
    if not plots:
        return []
    
    # Группируем участки по ячейкам сетки
    clusters_dict = {}
    
    for plot in plots:
        if not plot.centroid:
            continue
        
        try:
            point = to_shape(plot.centroid)
            lat, lon = point.y, point.x
            
            # Определяем ячейку сетки
            grid_lat = int(lat / grid_size) * grid_size
            grid_lon = int(lon / grid_size) * grid_size
            grid_key = (grid_lat, grid_lon)
            
            if grid_key not in clusters_dict:
                clusters_dict[grid_key] = {
                    'plots': [],
                    'min_lat': lat,
                    'max_lat': lat,
                    'min_lon': lon,
                    'max_lon': lon,
                }
            
            cluster = clusters_dict[grid_key]
            cluster['plots'].append(plot)
            cluster['min_lat'] = min(cluster['min_lat'], lat)
            cluster['max_lat'] = max(cluster['max_lat'], lat)
            cluster['min_lon'] = min(cluster['min_lon'], lon)
            cluster['max_lon'] = max(cluster['max_lon'], lon)
        except Exception:
            continue
    
    # Формируем результат
    cluster_items = []
    for grid_key, cluster_data in clusters_dict.items():
        plots_in_cluster = cluster_data['plots']
        
        # Центр кластера
        center_lat = (cluster_data['min_lat'] + cluster_data['max_lat']) / 2
        center_lon = (cluster_data['min_lon'] + cluster_data['max_lon']) / 2
        
        # Диапазон цен
        prices = [p.price_public for p in plots_in_cluster if p.price_public]
        price_range = (min(prices), max(prices)) if prices else None
        
        cluster_items.append(ClusterItem(
            center=[center_lat, center_lon],
            count=len(plots_in_cluster),
            bounds=[
                [cluster_data['min_lat'], cluster_data['min_lon']],
                [cluster_data['max_lat'], cluster_data['max_lon']]
            ],
            price_range=price_range
        ))
    
    return cluster_items
