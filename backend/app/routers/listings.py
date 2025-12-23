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
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Получить список опубликованных объявлений с активными участками."""
    # Подзапрос для фильтрации объявлений с активными участками
    active_listings_ids = (
        db.query(Plot.listing_id)
        .filter(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )
    
    # Считаем общее количество
    total = (
        db.query(Listing)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listings_ids))
        .count()
    )
    
    pages = math.ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    
    # Получаем объявления
    listings = (
        db.query(Listing)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listings_ids))
        .order_by(desc(Listing.created_at))
        .offset(offset)
        .limit(size)
        .all()
    )
    
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
