"""
Админский API для управления участками.
Асинхронная версия.
"""

import math
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.plot import Plot, PlotStatus
from app.models.listing import Listing
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.utils.title_generator import generate_listing_title
from app.nspd_client import NspdClient, get_nspd_client

from app.schemas.admin_plot import (
    PlotAdminListItem,
    PlotAdminDetail,
    PlotCreate,
    PlotUpdate,
    PlotListResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    PlotMapItem,
    PlotMapResponse,
    BulkAssignRequest,
    BulkAssignResponse,
    BulkImportRequest,
    BulkImportResponse,
    BulkImportResultItem,
    BulkUpdateRequest,
    BulkUpdateResponse,
)


router = APIRouter()


async def regenerate_listing_title(db: AsyncSession, listing_id: int | None) -> None:
    """Перегенерировать название объявления если title_auto=True."""
    if not listing_id:
        return
    
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing or not listing.title_auto:
        return
    
    # Получаем все участки объявления
    result = await db.execute(
        select(Plot).where(Plot.listing_id == listing_id)
    )
    plots = result.scalars().all()
    
    # Генерируем новое название
    new_title = generate_listing_title(plots)
    if new_title:
        listing.title = new_title
        await db.commit()


def plot_to_list_item(plot: Plot) -> dict:
    """Преобразование Plot в PlotAdminListItem."""
    from geoalchemy2.shape import to_shape
    
    # Извлекаем координаты центроида
    centroid_coords = None
    if plot.centroid is not None:
        try:
            point = to_shape(plot.centroid)
            centroid_coords = [point.x, point.y]  # [lon, lat]
        except Exception:
            pass
    
    return {
        "id": plot.id,
        "cadastral_number": plot.cadastral_number,
        "area": plot.area,
        "address": plot.address,
        "price_public": plot.price_public,
        "price_per_sotka": plot.price_per_sotka,
        "status": plot.status,
        "has_geometry": plot.polygon is not None,
        "centroid_coords": centroid_coords,
        "land_use": plot.land_use,
        "land_category": plot.land_category,
        "listing": plot.listing,
        "comment": plot.comment,
        "created_at": plot.created_at,
        "updated_at": plot.updated_at,
    }


@router.get("/check-cadastral")
async def check_cadastral_number(
    cadastral_number: str = Query(..., description="Кадастровый номер для проверки"),
    exclude_id: int | None = Query(None, description="ID участка для исключения (при редактировании)"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Проверить существование участка с таким кадастровым номером.
    
    Возвращает информацию о дубликате если найден.
    """
    query = select(Plot).where(Plot.cadastral_number == cadastral_number)
    
    if exclude_id:
        query = query.where(Plot.id != exclude_id)
    
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    
    if existing:
        return {
            "exists": True,
            "plot_id": existing.id,
            "address": existing.address,
            "status": existing.status.value if existing.status else None,
        }
    
    return {"exists": False}


@router.get("/map", response_model=PlotMapResponse)
async def get_plots_for_map(
    north: float | None = Query(None, description="Северная граница (latitude)"),
    south: float | None = Query(None, description="Южная граница (latitude)"),
    east: float | None = Query(None, description="Восточная граница (longitude)"),
    west: float | None = Query(None, description="Западная граница (longitude)"),
    zoom: int | None = Query(None, description="Уровень зума карты"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Получить участки с геометрией для отображения на карте.
    """
    from geoalchemy2.shape import to_shape
    from geoalchemy2.functions import ST_MakeEnvelope, ST_Intersects
    from app.schemas.admin_plot import ListingShort, PlotClusterItem
    
    viewport_mode = all(p is not None for p in [north, south, east, west, zoom])
    
    if viewport_mode:
        viewport_envelope = ST_MakeEnvelope(west, south, east, north, 4326)
        
        query = (
            select(Plot)
            .where(Plot.polygon.isnot(None))
            .where(ST_Intersects(Plot.polygon, viewport_envelope))
        )
        
        count_result = await db.execute(
            select(func.count(Plot.id))
            .where(Plot.polygon.isnot(None))
            .where(ST_Intersects(Plot.polygon, viewport_envelope))
        )
        total_count = count_result.scalar() or 0
        
        CLUSTER_ZOOM_THRESHOLD = 13
        
        if zoom < CLUSTER_ZOOM_THRESHOLD:
            result = await db.execute(query)
            plots = result.scalars().all()
            clusters = _generate_admin_clusters(plots, zoom)
            return PlotMapResponse(
                items=[],
                clusters=clusters,
                total=total_count,
                mode="clusters"
            )
        else:
            query = query.limit(500)
            result = await db.execute(query)
            plots = result.scalars().all()
    else:
        result = await db.execute(
            select(Plot).where(Plot.polygon.isnot(None))
        )
        plots = result.scalars().all()
    
    items = []
    for plot in plots:
        try:
            poly = to_shape(plot.polygon)
            coords = list(poly.exterior.coords)
            polygon_coords = [[coord[1], coord[0]] for coord in coords]
            
            listing_info = None
            if plot.listing:
                listing_info = ListingShort(
                    id=plot.listing.id,
                    slug=plot.listing.slug,
                    title=plot.listing.title,
                )
            
            items.append(PlotMapItem(
                id=plot.id,
                cadastral_number=plot.cadastral_number,
                area=plot.area,
                address=plot.address,
                price_public=plot.price_public,
                comment=plot.comment,
                status=plot.status,
                listing_id=plot.listing_id,
                listing=listing_info,
                polygon_coords=polygon_coords,
            ))
        except Exception:
            continue
    
    return PlotMapResponse(items=items, total=len(items), clusters=[], mode="plots")


def _generate_admin_clusters(plots: list[Plot], zoom: int) -> list:
    """Генерация кластеров для админ-карты."""
    from geoalchemy2.shape import to_shape
    from app.schemas.admin_plot import PlotClusterItem
    
    grid_size = 0.5 / (2 ** (zoom - 8))
    clusters_dict = {}
    
    for plot in plots:
        if not plot.centroid:
            continue
        
        try:
            point = to_shape(plot.centroid)
            lat, lon = point.y, point.x
            
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
    
    cluster_items = []
    for grid_key, cluster_data in clusters_dict.items():
        plots_in_cluster = cluster_data['plots']
        
        center_lat = (cluster_data['min_lat'] + cluster_data['max_lat']) / 2
        center_lon = (cluster_data['min_lon'] + cluster_data['max_lon']) / 2
        
        unassigned = sum(1 for p in plots_in_cluster if p.listing_id is None)
        assigned = len(plots_in_cluster) - unassigned
        
        cluster_items.append(PlotClusterItem(
            center=[center_lat, center_lon],
            count=len(plots_in_cluster),
            unassigned_count=unassigned,
            assigned_count=assigned,
            bounds=[
                [cluster_data['min_lat'], cluster_data['min_lon']],
                [cluster_data['max_lat'], cluster_data['max_lon']]
            ],
        ))
    
    return cluster_items


@router.post("/bulk-assign", response_model=BulkAssignResponse)
async def bulk_assign_plots(
    data: BulkAssignRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовая привязка участков к объявлению."""
    result = await db.execute(
        select(Listing).where(Listing.id == data.listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    await db.execute(
        update(Plot).where(Plot.id.in_(data.plot_ids)).values(listing_id=data.listing_id)
    )
    updated = len(data.plot_ids)
    await db.commit()
    
    await regenerate_listing_title(db, data.listing_id)
    
    return BulkAssignResponse(updated_count=updated)


@router.get("/", response_model=PlotListResponse)
async def get_plots(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Поиск по кадастровому номеру"),
    address_search: str | None = Query(None, description="Поиск по адресу"),
    status_filter: PlotStatus | None = Query(None, alias="status", description="Статус"),
    has_geometry: bool | None = Query(None, description="Наличие координат"),
    area_min: float | None = Query(None, description="Мин. площадь (м²)"),
    area_max: float | None = Query(None, description="Макс. площадь (м²)"),
    listing_id: int | None = Query(None, description="ID объявления"),
    sort: str = Query("newest", description="newest | oldest | area_asc | area_desc"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список участков с фильтрацией."""
    query = select(Plot)
    count_query = select(func.count(Plot.id))
    
    if search:
        query = query.where(Plot.cadastral_number.ilike(f"%{search}%"))
        count_query = count_query.where(Plot.cadastral_number.ilike(f"%{search}%"))
    
    if address_search:
        query = query.where(Plot.address.ilike(f"%{address_search}%"))
        count_query = count_query.where(Plot.address.ilike(f"%{address_search}%"))
    
    if status_filter:
        query = query.where(Plot.status == status_filter)
        count_query = count_query.where(Plot.status == status_filter)
    
    if has_geometry is not None:
        if has_geometry:
            query = query.where(Plot.polygon.isnot(None))
            count_query = count_query.where(Plot.polygon.isnot(None))
        else:
            query = query.where(Plot.polygon.is_(None))
            count_query = count_query.where(Plot.polygon.is_(None))
    
    if area_min is not None:
        query = query.where(Plot.area >= area_min)
        count_query = count_query.where(Plot.area >= area_min)
    
    if area_max is not None:
        query = query.where(Plot.area <= area_max)
        count_query = count_query.where(Plot.area <= area_max)
    
    if listing_id is not None:
        query = query.where(Plot.listing_id == listing_id)
        count_query = count_query.where(Plot.listing_id == listing_id)
    
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    sort_mapping = {
        "cadastral_asc": Plot.cadastral_number.asc().nulls_last(),
        "cadastral_desc": Plot.cadastral_number.desc().nulls_last(),
        "area_asc": Plot.area.asc().nulls_last(),
        "area_desc": Plot.area.desc().nulls_last(),
        "price_asc": Plot.price_public.asc().nulls_last(),
        "price_desc": Plot.price_public.desc().nulls_last(),
        "address_asc": Plot.address.asc().nulls_last(),
        "address_desc": Plot.address.desc().nulls_last(),
        "status_asc": Plot.status.asc(),
        "status_desc": Plot.status.desc(),
        "geometry_asc": Plot.polygon.isnot(None).asc(),
        "geometry_desc": Plot.polygon.isnot(None).desc(),
        "comment_asc": Plot.comment.asc().nulls_last(),
        "comment_desc": Plot.comment.desc().nulls_last(),
        "newest": desc(Plot.created_at),
        "oldest": Plot.created_at,
    }
    
    order_by = sort_mapping.get(sort, sort_mapping["newest"])
    query = query.order_by(order_by).offset(offset).limit(size)
    
    result = await db.execute(query)
    plots = result.scalars().all()
    
    return PlotListResponse(
        items=[plot_to_list_item(p) for p in plots],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{plot_id}", response_model=PlotAdminDetail)
async def get_plot(
    plot_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить детальную информацию об участке."""
    result = await db.execute(
        select(Plot).where(Plot.id == plot_id)
    )
    plot = result.scalar_one_or_none()
    
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    return {
        **plot_to_list_item(plot),
        "listing_id": plot.listing_id,
        "price_private": plot.price_private,
        "price_per_sotka_private": plot.price_per_sotka_private,
        "owner": plot.owner,
    }


@router.post("/", response_model=PlotAdminDetail, status_code=status.HTTP_201_CREATED)
async def create_plot(
    data: PlotCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать новый участок."""
    plot = Plot(**data.model_dump())
    db.add(plot)
    await db.commit()
    await db.refresh(plot)
    
    await regenerate_listing_title(db, plot.listing_id)
    
    return {
        **plot_to_list_item(plot),
        "listing_id": plot.listing_id,
        "price_private": plot.price_private,
        "price_per_sotka_private": plot.price_per_sotka_private,
        "owner": plot.owner,
    }


@router.put("/{plot_id}", response_model=PlotAdminDetail)
async def update_plot(
    plot_id: int,
    data: PlotUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить участок."""
    result = await db.execute(
        select(Plot).where(Plot.id == plot_id)
    )
    plot = result.scalar_one_or_none()
    
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plot, key, value)
    
    await db.commit()
    await db.refresh(plot)
    
    await regenerate_listing_title(db, plot.listing_id)
    
    return {
        **plot_to_list_item(plot),
        "listing_id": plot.listing_id,
        "price_private": plot.price_private,
        "price_per_sotka_private": plot.price_per_sotka_private,
        "owner": plot.owner,
    }


@router.delete("/{plot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plot(
    plot_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить участок."""
    result = await db.execute(
        select(Plot).where(Plot.id == plot_id)
    )
    plot = result.scalar_one_or_none()
    
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    listing_id = plot.listing_id
    await db.delete(plot)
    await db.commit()
    
    await regenerate_listing_title(db, listing_id)
    
    return None


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_plots(
    data: BulkDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовое удаление участков."""
    result = await db.execute(
        delete(Plot).where(Plot.id.in_(data.ids))
    )
    deleted = result.rowcount
    await db.commit()
    
    return BulkDeleteResponse(deleted_count=deleted)


@router.post("/{plot_id}/fetch-geometry", response_model=PlotAdminDetail)
async def fetch_geometry_from_nspd(
    plot_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
    nspd_client: NspdClient = Depends(get_nspd_client),
):
    """Получить координаты участка из NSPD по кадастровому номеру."""
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint
    
    result = await db.execute(
        select(Plot).where(Plot.id == plot_id)
    )
    plot = result.scalar_one_or_none()
    
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    if not plot.cadastral_number:
        raise HTTPException(status_code=400, detail="Кадастровый номер не указан")
    
    cadastral_data = await nspd_client.get_object_info(plot.cadastral_number)
    
    if not cadastral_data:
        raise HTTPException(status_code=404, detail="Объект не найден в NSPD")
    
    if not cadastral_data.coordinates_wgs84 or cadastral_data.geometry_type != "Polygon":
        raise HTTPException(status_code=400, detail="Объект не имеет полигональной геометрии")
    
    outer_ring = cadastral_data.coordinates_wgs84[0]
    shapely_polygon = ShapelyPolygon(outer_ring)
    plot.polygon = from_shape(shapely_polygon, srid=4326)
    
    if cadastral_data.centroid_wgs84:
        centroid_point = ShapelyPoint(cadastral_data.centroid_wgs84)
        plot.centroid = from_shape(centroid_point, srid=4326)
    
    if not plot.address and cadastral_data.address:
        plot.address = cadastral_data.address
    if not plot.area and cadastral_data.area_sq_m:
        plot.area = cadastral_data.area_sq_m
    
    await db.commit()
    await db.refresh(plot)
    
    return {
        **plot_to_list_item(plot),
        "listing_id": plot.listing_id,
        "price_private": plot.price_private,
        "price_per_sotka_private": plot.price_per_sotka_private,
        "owner": plot.owner,
    }


@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_plots(
    data: BulkImportRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
    nspd_client: NspdClient = Depends(get_nspd_client),
):
    """Массовый импорт участков из JSON."""
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint
    
    results: list[BulkImportResultItem] = []
    created_count = 0
    updated_count = 0
    error_count = 0
    
    for item in data.items:
        try:
            result = await db.execute(
                select(Plot).where(Plot.cadastral_number == item.cadastral_number)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                if item.price is not None:
                    existing.price_public = item.price
                if item.comment is not None:
                    existing.comment = item.comment
                plot = existing
                status = "updated"
                updated_count += 1
            else:
                plot = Plot(
                    cadastral_number=item.cadastral_number,
                    price_public=item.price,
                    comment=item.comment,
                )
                db.add(plot)
                await db.flush()
                status = "created"
                created_count += 1
            
            nspd_status = "skipped"
            try:
                cadastral_data = await nspd_client.get_object_info(item.cadastral_number)
                
                if cadastral_data:
                    if cadastral_data.coordinates_wgs84 and cadastral_data.geometry_type == "Polygon":
                        outer_ring = cadastral_data.coordinates_wgs84[0]
                        shapely_polygon = ShapelyPolygon(outer_ring)
                        plot.polygon = from_shape(shapely_polygon, srid=4326)
                        
                        if cadastral_data.centroid_wgs84:
                            centroid_point = ShapelyPoint(cadastral_data.centroid_wgs84)
                            plot.centroid = from_shape(centroid_point, srid=4326)
                    
                    if not plot.address and cadastral_data.address:
                        plot.address = cadastral_data.address
                    if not plot.area and cadastral_data.area_sq_m:
                        plot.area = cadastral_data.area_sq_m
                    
                    nspd_status = "success"
                else:
                    nspd_status = "not_found"
            except Exception as e:
                nspd_status = f"error: {str(e)}"
            
            results.append(BulkImportResultItem(
                cadastral_number=item.cadastral_number,
                plot_id=plot.id,
                status=status,
                nspd_status=nspd_status,
            ))
            
        except Exception as e:
            error_count += 1
            results.append(BulkImportResultItem(
                cadastral_number=item.cadastral_number,
                status="error",
                message=str(e),
            ))
    
    await db.commit()
    
    return BulkImportResponse(
        total=len(data.items),
        created=created_count,
        updated=updated_count,
        errors=error_count,
        items=results,
    )


@router.post("/bulk-import/stream")
async def bulk_import_stream(
    data: BulkImportRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
    nspd_client: NspdClient = Depends(get_nspd_client),
):
    """Массовый импорт участков с streaming-ответом (NDJSON)."""
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint

    async def event_generator():
        yield json.dumps({"type": "start", "total": len(data.items)}) + "\n"
        
        results: list[BulkImportResultItem] = []
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for index, item in enumerate(data.items):
            try:
                result = await db.execute(
                    select(Plot).where(Plot.cadastral_number == item.cadastral_number)
                )
                existing = result.scalar_one_or_none()
                
                if existing:
                    if item.price is not None:
                        existing.price_public = item.price
                    if item.comment is not None:
                        existing.comment = item.comment
                    plot = existing
                    status = "updated"
                    updated_count += 1
                else:
                    plot = Plot(
                        cadastral_number=item.cadastral_number,
                        price_public=item.price,
                        comment=item.comment,
                    )
                    db.add(plot)
                    await db.flush()
                    status = "created"
                    created_count += 1
                
                nspd_status = "skipped"
                try:
                    yield json.dumps({
                        "type": "processing",
                        "current": index + 1,
                        "total": len(data.items),
                        "cadastral_number": item.cadastral_number
                    }) + "\n"

                    cadastral_data = await nspd_client.get_object_info(item.cadastral_number)
                    
                    if cadastral_data:
                        if cadastral_data.coordinates_wgs84 and cadastral_data.geometry_type == "Polygon":
                            outer_ring = cadastral_data.coordinates_wgs84[0]
                            shapely_polygon = ShapelyPolygon(outer_ring)
                            plot.polygon = from_shape(shapely_polygon, srid=4326)
                            
                            if cadastral_data.centroid_wgs84:
                                centroid_point = ShapelyPoint(cadastral_data.centroid_wgs84)
                                plot.centroid = from_shape(centroid_point, srid=4326)
                        
                        if not plot.address and cadastral_data.address:
                            plot.address = cadastral_data.address
                        if not plot.area and cadastral_data.area_sq_m:
                            plot.area = cadastral_data.area_sq_m
                        
                        nspd_status = "success"
                    else:
                        nspd_status = "not_found"
                except Exception as e:
                    nspd_status = f"error: {str(e)}"
                
                await db.commit()
                
                result_item = BulkImportResultItem(
                    cadastral_number=item.cadastral_number,
                    plot_id=plot.id,
                    status=status,
                    nspd_status=nspd_status,
                )
                results.append(result_item)
                
                yield json.dumps({
                    "type": "progress",
                    "current": index + 1,
                    "total": len(data.items),
                    "item": result_item.model_dump()
                }) + "\n"
                
                await asyncio.sleep(0.01)
                
            except Exception as e:
                error_count += 1
                error_item = BulkImportResultItem(
                    cadastral_number=item.cadastral_number,
                    status="error",
                    message=str(e),
                )
                results.append(error_item)
                yield json.dumps({
                    "type": "progress",
                    "current": index + 1,
                    "total": len(data.items),
                    "item": error_item.model_dump()
                }) + "\n"
        
        summary = BulkImportResponse(
            total=len(data.items),
            created=created_count,
            updated=updated_count,
            errors=error_count,
            items=results,
        )
        yield json.dumps({"type": "finish", "summary": summary.model_dump()}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.post("/bulk-update", response_model=BulkUpdateResponse)
async def bulk_update_plots(
    data: BulkUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовое обновление свойств участков."""
    update_data = {}
    
    if data.land_use_id is not None:
        update_data["land_use_id"] = data.land_use_id
    if data.land_category_id is not None:
        update_data["land_category_id"] = data.land_category_id
    if data.price_public is not None:
        update_data["price_public"] = data.price_public
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Не указаны поля для обновления")
    
    result = await db.execute(
        update(Plot).where(Plot.id.in_(data.plot_ids)).values(**update_data)
    )
    updated = result.rowcount
    await db.commit()
    
    return BulkUpdateResponse(updated_count=updated)
