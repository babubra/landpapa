"""
Админский API для управления объявлениями.
Асинхронная версия.
"""

import math
import os
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, or_, func, delete, update
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.config import settings
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.models.image import Image
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.utils.title_generator import generate_listing_title
from app.schemas.admin_listing import (
    ListingAdminListItem,
    ListingAdminDetail,
    ListingCreate,
    ListingUpdate,
    ListingListResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    PlotShortItem,
    RealtorItem,
)


router = APIRouter()


@router.get("/realtors", response_model=list[RealtorItem])
async def get_realtors(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список активных риэлторов для формы."""
    from app.models.realtor import Realtor
    result = await db.execute(
        select(Realtor).where(Realtor.is_active == True).order_by(Realtor.name)
    )
    realtors = result.scalars().all()
    return realtors


def location_to_dict(location) -> dict | None:
    """Преобразование Location в словарь для сериализации.
    
    Parent загружается через joinedload в запросе.
    """
    if not location:
        return None
    
    # Проверяем загружен ли parent (через inspect)
    from sqlalchemy import inspect
    state = inspect(location)
    parent_loaded = 'parent' not in state.unloaded
    
    parent_dict = None
    if parent_loaded and location.parent:
        parent_dict = {
            "id": location.parent.id,
            "name": location.parent.name,
            "slug": location.parent.slug,
            "type": location.parent.type.value if hasattr(location.parent.type, 'value') else str(location.parent.type),
            "parent": None
        }
    
    return {
        "id": location.id,
        "name": location.name,
        "slug": location.slug,
        "type": location.type.value if hasattr(location.type, 'value') else str(location.type),
        "parent": parent_dict
    }


def listing_to_list_item(listing: Listing) -> dict:
    """Преобразование Listing в ListingAdminListItem."""
    # Собираем кадастровые номера всех привязанных участков
    cadastral_numbers = [
        p.cadastral_number 
        for p in listing.plots 
        if p.cadastral_number
    ]
    
    return {
        "id": listing.id,
        "slug": listing.slug,
        "title": listing.title,
        "cadastral_numbers": cadastral_numbers,
        "is_published": listing.is_published,
        "is_featured": listing.is_featured,
        "settlement": listing.settlement,  # deprecated
        "location": location_to_dict(listing.location),  # NEW: явное преобразование
        "location_id": listing.location_id, # NEW
        "realtor": listing.realtor,
        "plots_count": listing.plots_count,
        "total_area": listing.total_area,
        "area_min": listing.area_min,
        "area_max": listing.area_max,
        "price_min": listing.price_min,
        "price_max": listing.price_max,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
    }


def listing_to_detail(listing: Listing) -> dict:
    """Преобразование Listing в ListingAdminDetail."""
    return {
        "id": listing.id,
        "slug": listing.slug,
        "title": listing.title,
        "description": listing.description,
        "is_published": listing.is_published,
        "is_featured": listing.is_featured,
        "title_auto": listing.title_auto,
        "settlement_id": listing.settlement_id,
        "settlement": listing.settlement,
        "location_id": listing.location_id,
        "location": listing.location,
        "realtor_id": listing.realtor_id,
        "realtor": listing.realtor,
        "meta_title": listing.meta_title,
        "meta_description": listing.meta_description,
        "plots": listing.plots,
        "images": listing.images,
        "plots_count": listing.plots_count,
        "total_area": listing.total_area,
        "price_min": listing.price_min,
        "price_max": listing.price_max,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
    }


@router.get("/search-plots", response_model=list[PlotShortItem])
async def search_plots(
    q: str = Query(..., min_length=1, description="Поиск по кадастровому номеру"),
    listing_id: int | None = Query(None, description="ID текущего объявления (для редактирования)"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Поиск участков по кадастровому номеру.
    
    Возвращает участки без привязки к объявлению,
    или уже привязанные к указанному listing_id (при редактировании).
    """
    query = select(Plot).where(Plot.cadastral_number.ilike(f"%{q}%"))
    
    # Показываем только свободные участки или уже привязанные к текущему объявлению
    if listing_id:
        query = query.where(
            or_(
                Plot.listing_id.is_(None),
                Plot.listing_id == listing_id
            )
        )
    else:
        query = query.where(Plot.listing_id.is_(None))
    
    query = query.limit(limit)
    result = await db.execute(query)
    plots = result.scalars().all()
    return plots


@router.get("/", response_model=ListingListResponse)
async def get_listings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    # Фильтры
    search: str | None = Query(None, description="Поиск по названию/slug"),
    cadastral_search: str | None = Query(None, description="Поиск по кадастровому номеру участка"),
    settlement_id: int | None = Query(None, description="ID населённого пункта (deprecated, для совместимости)"),
    location_id: int | None = Query(None, description="ID локации из новой таблицы locations"),
    is_published: bool | None = Query(None, description="Статус публикации"),
    is_featured: bool | None = Query(None, description="Спецпредложение"),
    # Сортировка
    sort: str = Query("newest", description="newest | oldest | title_asc | title_desc"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список объявлений с фильтрацией."""
    from app.models.location import Location
    
    query = select(Listing).options(
        joinedload(Listing.location).joinedload(Location.parent)
    )
    count_query = select(func.count(Listing.id))
    
    # Фильтрация по поиску
    if search:
        search_filter = or_(
            Listing.title.ilike(f"%{search}%"),
            Listing.slug.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Фильтрация по кадастровому номеру связанных участков
    if cadastral_search:
        listing_ids_subquery = (
            select(Plot.listing_id)
            .where(Plot.cadastral_number.ilike(f"%{cadastral_search}%"))
            .where(Plot.listing_id.isnot(None))
            .distinct()
            .subquery()
        )
        cadastral_filter = Listing.id.in_(select(listing_ids_subquery.c.listing_id))
        query = query.where(cadastral_filter)
        count_query = count_query.where(cadastral_filter)
    
    # Фильтрация по локации (новая модель - приоритет)
    if location_id is not None:
        location_filter = Listing.location_id == location_id
        query = query.where(location_filter)
        count_query = count_query.where(location_filter)
    # Совместимость со старой моделью (deprecated)
    elif settlement_id is not None:
        old_location_filter = or_(
            Listing.settlement_id == settlement_id,
            Listing.location_id == settlement_id  # fallback
        )
        query = query.where(old_location_filter)
        count_query = count_query.where(old_location_filter)
    
    # Фильтрация по статусу публикации
    if is_published is not None:
        query = query.where(Listing.is_published == is_published)
        count_query = count_query.where(Listing.is_published == is_published)
    
    # Фильтрация по спецпредложению
    if is_featured is not None:
        query = query.where(Listing.is_featured == is_featured)
        count_query = count_query.where(Listing.is_featured == is_featured)
    
    # Подсчёт
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    # Сортировка
    sort_mapping = {
        "newest": desc(Listing.created_at),
        "oldest": Listing.created_at,
        "title_asc": Listing.title.asc(),
        "title_desc": Listing.title.desc(),
    }
    order_by = sort_mapping.get(sort, sort_mapping["newest"])
    query = query.order_by(order_by).offset(offset).limit(size)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    return ListingListResponse(
        items=[listing_to_list_item(l) for l in listings],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{listing_id}", response_model=ListingAdminDetail)
async def get_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить детальную информацию об объявлении."""
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    return listing_to_detail(listing)


@router.post("/", response_model=ListingAdminDetail, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: ListingCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать новое объявление. Slug генерируется автоматически."""
    from app.slug_utils import generate_slug
    from app.models.realtor import Realtor
    from app.models.location import Settlement, Location
    
    # Проверка существования риэлтора
    result = await db.execute(
        select(Realtor).where(Realtor.id == data.realtor_id)
    )
    realtor = result.scalar_one_or_none()
    if not realtor:
        raise HTTPException(status_code=400, detail="Риэлтор не найден")
    
    # Проверка существования локации (новая иерархия)
    if data.location_id:
        result = await db.execute(
            select(Location).where(Location.id == data.location_id)
        )
        location = result.scalar_one_or_none()
        if not location:
            raise HTTPException(status_code=400, detail="Локация не найдена")
    
    # Проверка существования населённого пункта (deprecated)
    if data.settlement_id:
        result = await db.execute(
            select(Settlement).where(Settlement.id == data.settlement_id)
        )
        settlement = result.scalar_one_or_none()
        if not settlement:
            raise HTTPException(status_code=400, detail="Населённый пункт не найден")
    
    # Создаём объявление (сначала без slug, чтобы получить ID)
    listing_data = data.model_dump(exclude={"plot_ids", "image_ids"})
    listing = Listing(**listing_data)
    listing.slug = "temp"  # Временный slug
    db.add(listing)
    await db.flush()  # Получаем ID
    
    # Генерируем slug из title + ID
    listing.slug = generate_slug(data.title, listing.id)
    
    # Привязываем участки
    if data.plot_ids:
        result = await db.execute(
            select(Plot).where(Plot.id.in_(data.plot_ids))
        )
        plots = result.scalars().all()
        for plot in plots:
            plot.listing_id = listing.id

    # Привязываем изображения
    if data.image_ids:
        result = await db.execute(
            select(Image).where(Image.id.in_(data.image_ids))
        )
        images = result.scalars().all()
        images_map = {img.id: img for img in images}
        for index, img_id in enumerate(data.image_ids):
            img = images_map.get(img_id)
            if img:
                img.entity_type = 'listing'
                img.entity_id = listing.id
                img.sort_order = index
    
    await db.commit()
    await db.refresh(listing)
    
    # Перегенерируем название если включён авто-режим
    if listing.title_auto and listing.plots:
        listing.title = generate_listing_title(listing.plots, listing.settlement)
        await db.commit()
        await db.refresh(listing)
    
    return listing_to_detail(listing)


@router.put("/{listing_id}", response_model=ListingAdminDetail)
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить объявление. Slug остаётся неизменным (создаётся один раз при создании)."""
    from app.models.realtor import Realtor
    from app.models.location import Settlement, Location
    
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    # Проверка существования риэлтора
    if data.realtor_id:
        result = await db.execute(
            select(Realtor).where(Realtor.id == data.realtor_id)
        )
        realtor = result.scalar_one_or_none()
        if not realtor:
            raise HTTPException(status_code=400, detail="Риэлтор не найден")
    
    # Проверка существования локации (новая иерархия)
    if data.location_id:
        result = await db.execute(
            select(Location).where(Location.id == data.location_id)
        )
        location = result.scalar_one_or_none()
        if not location:
            raise HTTPException(status_code=400, detail="Локация не найдена")
    
    # Проверка существования населённого пункта (deprecated)
    if data.settlement_id:
        result = await db.execute(
            select(Settlement).where(Settlement.id == data.settlement_id)
        )
        settlement = result.scalar_one_or_none()
        if not settlement:
            raise HTTPException(status_code=400, detail="Населённый пункт не найден")
    
    # Обновляем поля (кроме plot_ids и slug — slug неизменен после создания)
    update_data = data.model_dump(exclude_unset=True, exclude={"plot_ids"})
    for key, value in update_data.items():
        setattr(listing, key, value)
    
    # Обновляем привязку участков если передано
    if data.plot_ids is not None:
        # Отвязываем все текущие участки
        result = await db.execute(
            select(Plot).where(Plot.listing_id == listing_id)
        )
        current_plots = result.scalars().all()
        for plot in current_plots:
            plot.listing_id = None
        
        # Привязываем новые
        if data.plot_ids:
            result = await db.execute(
                select(Plot).where(Plot.id.in_(data.plot_ids))
            )
            new_plots = result.scalars().all()
            for plot in new_plots:
                plot.listing_id = listing_id

    # Обновляем привязку изображений
    if data.image_ids is not None:
        # Отвязываем текущие
        result = await db.execute(
            select(Image).where(
                Image.entity_type == 'listing',
                Image.entity_id == listing_id
            )
        )
        current_images = result.scalars().all()
        for img in current_images:
            img.entity_type = None
            img.entity_id = None
        
        # Привязываем новые
        if data.image_ids:
            result = await db.execute(
                select(Image).where(Image.id.in_(data.image_ids))
            )
            images = result.scalars().all()
            images_map = {img.id: img for img in images}
            for index, img_id in enumerate(data.image_ids):
                img = images_map.get(img_id)
                if img:
                    img.entity_type = 'listing'
                    img.entity_id = listing_id
                    img.sort_order = index
    
    await db.commit()
    await db.refresh(listing)

    # Перегенерируем название если включён авто-режим
    if listing.title_auto and listing.plots:
        listing.title = generate_listing_title(listing.plots, listing.settlement)
        await db.commit()
        await db.refresh(listing)
    
    return listing_to_detail(listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить объявление."""
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    # Отвязываем участки перед удалением
    result = await db.execute(
        select(Plot).where(Plot.listing_id == listing_id)
    )
    plots = result.scalars().all()
    for plot in plots:
        plot.listing_id = None
        
    # Удаляем изображения физически и из БД
    result = await db.execute(
        select(Image).where(
            Image.entity_type == 'listing',
            Image.entity_id == listing_id
        )
    )
    images = result.scalars().all()
    
    for img in images:
        try:
            if img.url:
                filename = os.path.basename(img.url)
                filepath = os.path.join(settings.upload_dir, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
            
            if img.thumbnail_url:
                thumb_name = os.path.basename(img.thumbnail_url)
                thumb_path = os.path.join(settings.upload_dir, thumb_name)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            
            await db.delete(img)
        except Exception as e:
            print(f"Error deleting image {img.id}: {e}")
    
    await db.delete(listing)
    await db.commit()
    return None


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_listings(
    data: BulkDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовое удаление объявлений."""
    # Отвязываем участки
    await db.execute(
        update(Plot).where(Plot.listing_id.in_(data.ids)).values(listing_id=None)
    )
    
    # Удаляем объявления
    result = await db.execute(
        delete(Listing).where(Listing.id.in_(data.ids))
    )
    deleted = result.rowcount
    await db.commit()
    
    return BulkDeleteResponse(deleted_count=deleted)
