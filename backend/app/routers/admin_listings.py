"""
Админский API для управления объявлениями.
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список активных риэлторов для формы."""
    from app.models.realtor import Realtor
    realtors = db.query(Realtor).filter(Realtor.is_active == True).order_by(Realtor.name).all()
    return realtors


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
        "settlement": listing.settlement,
        "realtor": listing.realtor,
        "plots_count": listing.plots_count,
        "total_area": listing.total_area,
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
        "settlement_id": listing.settlement_id,
        "settlement": listing.settlement,
        "realtor_id": listing.realtor_id,
        "realtor": listing.realtor,
        "meta_title": listing.meta_title,
        "meta_description": listing.meta_description,
        "plots": listing.plots,
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Поиск участков по кадастровому номеру.
    
    Возвращает участки без привязки к объявлению,
    или уже привязанные к указанному listing_id (при редактировании).
    """
    query = db.query(Plot).filter(Plot.cadastral_number.ilike(f"%{q}%"))
    
    # Показываем только свободные участки или уже привязанные к текущему объявлению
    if listing_id:
        query = query.filter(
            or_(
                Plot.listing_id.is_(None),
                Plot.listing_id == listing_id
            )
        )
    else:
        query = query.filter(Plot.listing_id.is_(None))
    
    plots = query.limit(limit).all()
    return plots


@router.get("/", response_model=ListingListResponse)
async def get_listings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    # Фильтры
    search: str | None = Query(None, description="Поиск по названию/slug"),
    cadastral_search: str | None = Query(None, description="Поиск по кадастровому номеру участка"),
    settlement_id: int | None = Query(None, description="ID населённого пункта"),
    is_published: bool | None = Query(None, description="Статус публикации"),
    is_featured: bool | None = Query(None, description="Спецпредложение"),
    # Сортировка
    sort: str = Query("newest", description="newest | oldest | title_asc | title_desc"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список объявлений с фильтрацией."""
    query = db.query(Listing)
    
    # Фильтрация по поиску
    if search:
        query = query.filter(
            or_(
                Listing.title.ilike(f"%{search}%"),
                Listing.slug.ilike(f"%{search}%")
            )
        )
    
    # Фильтрация по кадастровому номеру связанных участков
    if cadastral_search:
        # Подзапрос для поиска listing_id по кадастровому номеру участков
        listing_ids_subquery = (
            db.query(Plot.listing_id)
            .filter(Plot.cadastral_number.ilike(f"%{cadastral_search}%"))
            .filter(Plot.listing_id.isnot(None))
            .distinct()
            .subquery()
        )
        query = query.filter(Listing.id.in_(listing_ids_subquery))
    
    # Фильтрация по населённому пункту
    if settlement_id is not None:
        query = query.filter(Listing.settlement_id == settlement_id)
    
    # Фильтрация по статусу публикации
    if is_published is not None:
        query = query.filter(Listing.is_published == is_published)
    
    # Фильтрация по спецпредложению
    if is_featured is not None:
        query = query.filter(Listing.is_featured == is_featured)
    
    # Подсчёт
    total = query.count()
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
    query = query.order_by(order_by)
    
    listings = query.offset(offset).limit(size).all()
    
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
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить детальную информацию об объявлении."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    return listing_to_detail(listing)


@router.post("/", response_model=ListingAdminDetail, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать новое объявление. Slug генерируется автоматически."""
    from app.slug_utils import generate_slug
    
    # Проверка существования риэлтора
    from app.models.realtor import Realtor
    realtor = db.query(Realtor).filter(Realtor.id == data.realtor_id).first()
    if not realtor:
        raise HTTPException(status_code=400, detail="Риэлтор не найден")
    
    # Проверка существования населённого пункта
    if data.settlement_id:
        from app.models.location import Settlement
        settlement = db.query(Settlement).filter(Settlement.id == data.settlement_id).first()
        if not settlement:
            raise HTTPException(status_code=400, detail="Населённый пункт не найден")
    
    # Создаём объявление (сначала без slug, чтобы получить ID)
    listing_data = data.model_dump(exclude={"plot_ids"})
    listing = Listing(**listing_data)
    listing.slug = "temp"  # Временный slug
    db.add(listing)
    db.flush()  # Получаем ID
    
    # Генерируем slug из title + ID
    listing.slug = generate_slug(data.title, listing.id)
    
    # Привязываем участки
    if data.plot_ids:
        plots = db.query(Plot).filter(Plot.id.in_(data.plot_ids)).all()
        for plot in plots:
            plot.listing_id = listing.id
    
    db.commit()
    db.refresh(listing)
    
    return listing_to_detail(listing)


@router.put("/{listing_id}", response_model=ListingAdminDetail)
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить объявление. Slug регенерируется при изменении title."""
    from app.slug_utils import generate_slug
    
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    # Проверка существования риэлтора
    if data.realtor_id:
        from app.models.realtor import Realtor
        realtor = db.query(Realtor).filter(Realtor.id == data.realtor_id).first()
        if not realtor:
            raise HTTPException(status_code=400, detail="Риэлтор не найден")
    
    # Проверка существования населённого пункта
    if data.settlement_id:
        from app.models.location import Settlement
        settlement = db.query(Settlement).filter(Settlement.id == data.settlement_id).first()
        if not settlement:
            raise HTTPException(status_code=400, detail="Населённый пункт не найден")
    
    # Обновляем поля (кроме plot_ids)
    update_data = data.model_dump(exclude_unset=True, exclude={"plot_ids"})
    for key, value in update_data.items():
        setattr(listing, key, value)
    
    # Регенерируем slug если title изменился
    if data.title:
        listing.slug = generate_slug(data.title, listing.id)
    
    # Обновляем привязку участков если передано
    if data.plot_ids is not None:
        # Отвязываем все текущие участки
        current_plots = db.query(Plot).filter(Plot.listing_id == listing_id).all()
        for plot in current_plots:
            plot.listing_id = None
        
        # Привязываем новые
        if data.plot_ids:
            new_plots = db.query(Plot).filter(Plot.id.in_(data.plot_ids)).all()
            for plot in new_plots:
                plot.listing_id = listing_id
    
    db.commit()
    db.refresh(listing)
    
    return listing_to_detail(listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить объявление."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    
    # Отвязываем участки перед удалением
    plots = db.query(Plot).filter(Plot.listing_id == listing_id).all()
    for plot in plots:
        plot.listing_id = None
    
    db.delete(listing)
    db.commit()
    return None


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_listings(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Массовое удаление объявлений."""
    # Отвязываем участки
    db.query(Plot).filter(Plot.listing_id.in_(data.ids)).update(
        {"listing_id": None}, synchronize_session=False
    )
    
    # Удаляем объявления
    deleted = db.query(Listing).filter(Listing.id.in_(data.ids)).delete(
        synchronize_session=False
    )
    db.commit()
    
    return BulkDeleteResponse(deleted_count=deleted)
