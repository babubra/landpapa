"""
API для локаций (районы, населённые пункты).
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.models.location import District, Settlement
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus

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
async def get_districts(db: AsyncSession = Depends(get_async_db)):
    """Получить список районов с количеством активных объявлений."""
    # Подзапрос: объявления с активными участками
    active_listing_ids = (
        select(Plot.listing_id)
        .where(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    # Считаем объявления по районам
    query = (
        select(
            District.id,
            District.name,
            District.slug,
            func.count(Listing.id).label("listings_count"),
        )
        .outerjoin(Settlement, District.id == Settlement.district_id)
        .outerjoin(Listing, Settlement.id == Listing.settlement_id)
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listing_ids.c.listing_id)))
        .group_by(District.id, District.name, District.slug)
        .order_by(District.sort_order, District.name)
    )
    
    result = await db.execute(query)
    results = result.all()

    # Также добавляем районы без объявлений
    all_districts_result = await db.execute(
        select(District).order_by(District.sort_order, District.name)
    )
    all_districts = all_districts_result.scalars().all()
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
    db: AsyncSession = Depends(get_async_db),
):
    """Получить список населённых пунктов с количеством объявлений."""
    
    if all:
        # Режим для админки: все населённые пункты
        query = select(Settlement)
        if district_id:
            query = query.where(Settlement.district_id == district_id)
        
        query = query.order_by(Settlement.sort_order, Settlement.name)
        result = await db.execute(query)
        settlements = result.scalars().all()
        
        # Подсчёт объявлений для каждого населённого пункта
        counts_result = await db.execute(
            select(Listing.settlement_id, func.count(Listing.id))
            .group_by(Listing.settlement_id)
        )
        listing_counts = dict(counts_result.all())
        
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
        select(Plot.listing_id)
        .where(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    query = (
        select(
            Settlement.id,
            Settlement.name,
            Settlement.slug,
            func.count(Listing.id).label("listings_count"),
        )
        .outerjoin(Listing, Settlement.id == Listing.settlement_id)
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listing_ids.c.listing_id)))
    )

    if district_id:
        query = query.where(Settlement.district_id == district_id)

    query = (
        query.group_by(Settlement.id, Settlement.name, Settlement.slug)
        .order_by(Settlement.sort_order, Settlement.name)
    )
    
    result = await db.execute(query)
    results = result.all()

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
async def get_settlements_grouped(db: AsyncSession = Depends(get_async_db)):
    """
    Получить населённые пункты, сгруппированные по районам.
    
    Используется для фильтра местоположения с множественным выбором.
    Сортировка: города без районов (sort_order=0) первыми, затем по алфавиту.
    Показываются только населённые пункты с активными объявлениями.
    """
    # Подзапрос: объявления с активными участками
    active_listing_ids = (
        select(Plot.listing_id)
        .where(Plot.status == PlotStatus.active)
        .distinct()
        .subquery()
    )

    # Получаем населённые пункты с количеством объявлений
    query = (
        select(
            Settlement.id,
            Settlement.name,
            Settlement.district_id,
            func.count(Listing.id).label("listings_count"),
        )
        .join(Listing, Settlement.id == Listing.settlement_id)
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listing_ids.c.listing_id)))
        .group_by(Settlement.id, Settlement.name, Settlement.district_id)
        .order_by(Settlement.name)
    )
    
    result = await db.execute(query)
    settlements_data = result.all()

    # Группируем по районам
    districts_map: dict[int, dict] = {}
    
    for s in settlements_data:
        district_id_val = s.district_id
        if district_id_val not in districts_map:
            district_result = await db.execute(
                select(District).where(District.id == district_id_val)
            )
            district = district_result.scalar_one_or_none()
            if district:
                districts_map[district_id_val] = {
                    "id": district.id,
                    "name": district.name,
                    "sort_order": district.sort_order,
                    "listings_count": 0,
                    "settlements": []
                }
        
        if district_id_val in districts_map:
            districts_map[district_id_val]["listings_count"] += s.listings_count
            districts_map[district_id_val]["settlements"].append(
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
