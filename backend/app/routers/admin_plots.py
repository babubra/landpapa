"""
Админский API для управления участками.
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.plot import Plot, PlotStatus
from app.models.listing import Listing
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.utils.title_generator import generate_listing_title
from app.schemas.admin_plot import (
    PlotAdminListItem,
    PlotAdminDetail,
    PlotCreate,
    PlotUpdate,
    PlotListResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
)


router = APIRouter()


def regenerate_listing_title(db: Session, listing_id: int | None) -> None:
    """Перегенерировать название объявления если title_auto=True."""
    if not listing_id:
        return
    
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing or not listing.title_auto:
        return
    
    # Получаем все участки объявления
    plots = db.query(Plot).filter(Plot.listing_id == listing_id).all()
    
    # Генерируем новое название
    new_title = generate_listing_title(plots)
    listing.title = new_title
    db.commit()


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
        "created_at": plot.created_at,
        "updated_at": plot.updated_at,
    }


@router.get("/check-cadastral")
async def check_cadastral_number(
    cadastral_number: str = Query(..., description="Кадастровый номер для проверки"),
    exclude_id: int | None = Query(None, description="ID участка для исключения (при редактировании)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Проверить существование участка с таким кадастровым номером.
    
    Возвращает информацию о дубликате если найден.
    """
    query = db.query(Plot).filter(Plot.cadastral_number == cadastral_number)
    
    if exclude_id:
        query = query.filter(Plot.id != exclude_id)
    
    existing = query.first()
    
    if existing:
        return {
            "exists": True,
            "plot_id": existing.id,
            "address": existing.address,
            "status": existing.status.value if existing.status else None,
        }
    
    return {"exists": False}


@router.get("/", response_model=PlotListResponse)
async def get_plots(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    # Фильтры
    search: str | None = Query(None, description="Поиск по кадастровому номеру"),
    status_filter: PlotStatus | None = Query(None, alias="status", description="Статус"),
    has_geometry: bool | None = Query(None, description="Наличие координат"),
    area_min: float | None = Query(None, description="Мин. площадь (м²)"),
    area_max: float | None = Query(None, description="Макс. площадь (м²)"),
    listing_id: int | None = Query(None, description="ID объявления"),
    # Сортировка
    sort: str = Query("newest", description="newest | oldest | area_asc | area_desc"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список участков с фильтрацией."""
    query = db.query(Plot)
    
    # Фильтрация
    if search:
        query = query.filter(Plot.cadastral_number.ilike(f"%{search}%"))
    
    if status_filter:
        query = query.filter(Plot.status == status_filter)
    
    if has_geometry is not None:
        if has_geometry:
            query = query.filter(Plot.polygon.isnot(None))
        else:
            query = query.filter(Plot.polygon.is_(None))
    
    if area_min is not None:
        query = query.filter(Plot.area >= area_min)
    
    if area_max is not None:
        query = query.filter(Plot.area <= area_max)
    
    if listing_id is not None:
        query = query.filter(Plot.listing_id == listing_id)
    
    # Подсчёт
    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    # Сортировка
    sort_mapping = {
        "cadastral_asc": Plot.cadastral_number.asc().nulls_last(),
        "cadastral_desc": Plot.cadastral_number.desc().nulls_last(),
        "area_asc": Plot.area.asc().nulls_last(),
        "area_desc": Plot.area.desc().nulls_last(),
        "price_asc": Plot.price_public.asc().nulls_last(),
        "price_desc": Plot.price_public.desc().nulls_last(),
        "newest": desc(Plot.created_at),
        "oldest": Plot.created_at,
    }
    
    order_by = sort_mapping.get(sort, sort_mapping["newest"])
    query = query.order_by(order_by)
    
    plots = query.offset(offset).limit(size).all()
    
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить детальную информацию об участке."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать новый участок."""
    plot = Plot(**data.model_dump())
    db.add(plot)
    db.commit()
    db.refresh(plot)
    
    # Перегенерируем название объявления
    regenerate_listing_title(db, plot.listing_id)
    
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить участок."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plot, key, value)
    
    db.commit()
    db.refresh(plot)
    
    # Перегенерируем название объявления
    regenerate_listing_title(db, plot.listing_id)
    
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить участок."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    listing_id = plot.listing_id  # Сохраняем до удаления
    db.delete(plot)
    db.commit()
    
    # Перегенерируем название объявления
    regenerate_listing_title(db, listing_id)
    
    return None


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_plots(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовое удаление участков."""
    deleted = db.query(Plot).filter(Plot.id.in_(data.ids)).delete(synchronize_session=False)
    db.commit()
    
    return BulkDeleteResponse(deleted_count=deleted)


@router.post("/{plot_id}/fetch-geometry", response_model=PlotAdminDetail)
async def fetch_geometry_from_nspd(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Получить координаты участка из NSPD по кадастровому номеру.
    
    Обновляет геометрию участка в БД при успешном получении.
    """
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint
    from app.nspd_client import get_nspd_client
    
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Участок не найден")
    
    if not plot.cadastral_number:
        raise HTTPException(status_code=400, detail="Кадастровый номер не указан")
    
    # Получаем данные из NSPD
    nspd_client = get_nspd_client()
    cadastral_data = await nspd_client.get_object_info(plot.cadastral_number)
    
    if not cadastral_data:
        raise HTTPException(status_code=404, detail="Объект не найден в NSPD")
    
    if not cadastral_data.coordinates_wgs84 or cadastral_data.geometry_type != "Polygon":
        raise HTTPException(status_code=400, detail="Объект не имеет полигональной геометрии")
    
    # Конвертируем координаты в PostGIS Polygon
    # coordinates_wgs84 = [[[lon, lat], [lon, lat], ...]]
    outer_ring = cadastral_data.coordinates_wgs84[0]
    shapely_polygon = ShapelyPolygon(outer_ring)
    
    # Сохраняем полигон (SRID 4326 = WGS84)
    plot.polygon = from_shape(shapely_polygon, srid=4326)
    
    # Сохраняем центроид
    if cadastral_data.centroid_wgs84:
        centroid_point = ShapelyPoint(cadastral_data.centroid_wgs84)
        plot.centroid = from_shape(centroid_point, srid=4326)
    
    # Опционально обновляем адрес и площадь если пустые
    if not plot.address and cadastral_data.address:
        plot.address = cadastral_data.address
    if not plot.area and cadastral_data.area_sq_m:
        plot.area = cadastral_data.area_sq_m
    
    db.commit()
    db.refresh(plot)
    
    return {
        **plot_to_list_item(plot),
        "listing_id": plot.listing_id,
        "price_private": plot.price_private,
        "price_per_sotka_private": plot.price_per_sotka_private,
        "owner": plot.owner,
    }
