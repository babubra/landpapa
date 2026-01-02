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
    all: bool = Query(False, description="Если True, возвращать все населённые пункты (для админки)"),
    db: Session = Depends(get_db),
):
    """Получить список населённых пунктов с количеством объявлений."""
    
    if all:
        # Режим для админки: все населённые пункты
        query = db.query(Settlement)
        if district_id:
            query = query.filter(Settlement.district_id == district_id)
        
        settlements = query.order_by(Settlement.sort_order, Settlement.name).all()
        
        # Подсчёт объявлений для каждого населённого пункта
        listing_counts = dict(
            db.query(Listing.settlement_id, func.count(Listing.id))
            .group_by(Listing.settlement_id)
            .all()
        )
        
        return [
            SettlementItem(
                id=s.id, 
                name=s.name, 
                slug=s.slug, 
                listings_count=listing_counts.get(s.id, 0)
            )
            for s in settlements
        ]
    
    # Режим по умолчанию: только с активными объявлениями
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


class SettlementGroupItem(BaseModel):
    """Населённый пункт в группе (без slug)."""
    id: int
    name: str
    listings_count: int

    class Config:
        from_attributes = True


class DistrictGroup(BaseModel):
    """Район с вложенными населёнными пунктами."""
    id: int
    name: str
    listings_count: int  # сумма по всем населённым пунктам
    settlements: list[SettlementGroupItem]

    class Config:
        from_attributes = True


@router.get("/settlements-grouped", response_model=list[DistrictGroup])
async def get_settlements_grouped(db: Session = Depends(get_db)):
    """
    Получить населённые пункты, сгруппированные по районам.
    
    Используется для фильтра местоположения с множественным выбором.
    Сортировка: города без районов (sort_order=0) первыми, затем по алфавиту.
    Показываются только населённые пункты с активными объявлениями.
    """
    # Подзапрос: объявления с активными участками
    active_listing_ids = (
        db.query(Plot.listing_id)
        .filter(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    # Получаем населённые пункты с количеством объявлений
    settlements_data = (
        db.query(
            Settlement.id,
            Settlement.name,
            Settlement.district_id,
            func.count(Listing.id).label("listings_count"),
        )
        .join(Listing, Settlement.id == Listing.settlement_id)
        .filter(Listing.is_published == True)
        .filter(Listing.id.in_(active_listing_ids))
        .group_by(Settlement.id, Settlement.name, Settlement.district_id)
        .order_by(Settlement.name)
        .all()
    )

    # Группируем по районам
    districts_map: dict[int, dict] = {}
    
    for s in settlements_data:
        district_id = s.district_id
        if district_id not in districts_map:
            district = db.query(District).filter(District.id == district_id).first()
            districts_map[district_id] = {
                "id": district.id,
                "name": district.name,
                "sort_order": district.sort_order,
                "listings_count": 0,
                "settlements": []
            }
        
        districts_map[district_id]["listings_count"] += s.listings_count
        districts_map[district_id]["settlements"].append(
            SettlementGroupItem(id=s.id, name=s.name, listings_count=s.listings_count)
        )

    # Сортировка: sort_order, затем по алфавиту
    sorted_districts = sorted(
        districts_map.values(), 
        key=lambda d: (d["sort_order"], d["name"])
    )

    return [
        DistrictGroup(
            id=d["id"],
            name=d["name"],
            listings_count=d["listings_count"],
            settlements=d["settlements"]
        )
        for d in sorted_districts
    ]
