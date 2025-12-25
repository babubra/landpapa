from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.location import District, Settlement
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from pydantic import BaseModel

router = APIRouter()


class DistrictItem(BaseModel):
    """Район с количеством объявлений."""
    id: int
    name: str
    slug: str
    listings_count: int

    class Config:
        from_attributes = True


class SettlementItem(BaseModel):
    """Населённый пункт с количеством объявлений."""
    id: int
    name: str
    slug: str
    listings_count: int

    class Config:
        from_attributes = True


@router.get("/districts", response_model=list[DistrictItem])
async def get_districts(db: Session = Depends(get_db)):
    """Получить список районов с количеством активных объявлений."""
    # Подзапрос: объявления с активными участками
    active_listing_ids = (
        db.query(Plot.listing_id)
        .filter(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    # Считаем объявления по районам
    results = (
        db.query(
            District.id,
            District.name,
            District.slug,
            func.count(Listing.id).label("listings_count"),
        )
        .outerjoin(Settlement, District.id == Settlement.district_id)
        .outerjoin(Listing, Settlement.id == Listing.settlement_id)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listing_ids))
        .group_by(District.id, District.name, District.slug)
        .order_by(District.sort_order, District.name)
        .all()
    )

    # Также добавляем районы без объявлений
    all_districts = db.query(District).order_by(District.sort_order, District.name).all()
    result_ids = {r.id for r in results}

    items = []
    for district in all_districts:
        if district.id in result_ids:
            for r in results:
                if r.id == district.id:
                    items.append(DistrictItem(
                        id=r.id, name=r.name, slug=r.slug, listings_count=r.listings_count
                    ))
                    break
        else:
            items.append(DistrictItem(
                id=district.id, name=district.name, slug=district.slug, listings_count=0
            ))

    return items


@router.get("/settlements", response_model=list[SettlementItem])
async def get_settlements(
    district_id: int | None = Query(None, description="ID района для фильтрации"),
    db: Session = Depends(get_db),
):
    """Получить список населённых пунктов с количеством объявлений."""
    # Подзапрос: объявления с активными участками
    active_listing_ids = (
        db.query(Plot.listing_id)
        .filter(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    query = (
        db.query(
            Settlement.id,
            Settlement.name,
            Settlement.slug,
            func.count(Listing.id).label("listings_count"),
        )
        .outerjoin(Listing, Settlement.id == Listing.settlement_id)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listing_ids))
    )

    if district_id:
        query = query.filter(Settlement.district_id == district_id)

    results = (
        query.group_by(Settlement.id, Settlement.name, Settlement.slug)
        .order_by(Settlement.sort_order, Settlement.name)
        .all()
    )

    return [
        SettlementItem(id=r.id, name=r.name, slug=r.slug, listings_count=r.listings_count)
        for r in results
    ]
