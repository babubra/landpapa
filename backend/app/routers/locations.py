"""
API для локаций (районы, населённые пункты).
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.models.location import District, Settlement, Location, LocationType
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


class ResolvedLocation(BaseModel):
    """Результат резолва slug → id."""
    district_id: int | None = None
    district_name: str | None = None
    district_slug: str | None = None
    settlement_id: int | None = None
    settlement_name: str | None = None
    settlement_slug: str | None = None
    settlement_type: str | None = None  # "г", "пос", "с"


@router.get("/resolve", response_model=ResolvedLocation)
async def resolve_location(
    district_slug: str | None = Query(None, description="Slug района"),
    settlement_slug: str | None = Query(None, description="Slug населённого пункта"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Резолв slug → id для гео-URL.
    
    Используется фронтендом для преобразования URL-параметров в ID для фильтрации.
    """
    result = ResolvedLocation()
    
    # Резолв района
    if district_slug:
        district_result = await db.execute(
            select(District).where(District.slug == district_slug)
        )
        district = district_result.scalar_one_or_none()
        if district:
            result.district_id = district.id
            result.district_name = district.name
            result.district_slug = district.slug
    
    # Резолв населённого пункта
    if settlement_slug:
        query = select(Settlement).where(Settlement.slug == settlement_slug)
        # Если указан район, ищем только в нём
        if result.district_id:
            query = query.where(Settlement.district_id == result.district_id)
        
        settlement_result = await db.execute(query)
        settlement = settlement_result.scalar_one_or_none()
        if settlement:
            result.settlement_id = settlement.id
            result.settlement_name = settlement.name
            result.settlement_slug = settlement.slug
            result.settlement_type = settlement.type
            # Если район не был указан, заполняем из settlement
            if not result.district_id and settlement.district:
                result.district_id = settlement.district.id
                result.district_name = settlement.district.name
                result.district_slug = settlement.district.slug
    
    return result


class SettlementGroupItem(BaseModel):
    """Населённый пункт в группе."""
    id: int
    name: str
    slug: str
    type: str | None = None  # "г", "пос", "с" и т.д.
    plots_count: int  # количество активных участков

    class Config:
        from_attributes = True


class DistrictGroup(BaseModel):
    """Район с вложенными населёнными пунктами."""
    id: int
    name: str
    slug: str
    plots_count: int  # сумма активных участков по всем населённым пунктам
    settlements: list[SettlementGroupItem]

    class Config:
        from_attributes = True


@router.get("/settlements-grouped", response_model=list[DistrictGroup])
async def get_settlements_grouped(db: AsyncSession = Depends(get_async_db)):
    """
    Получить населённые пункты, сгруппированные по районам.
    
    Используется для фильтра местоположения с множественным выбором.
    Сортировка: города без районов (sort_order=0) первыми, затем по алфавиту.
    Показываются только населённые пункты с активными участками.
    Возвращает количество активных участков (plots_count), а не объявлений.
    """
    # Получаем населённые пункты с количеством активных участков
    query = (
        select(
            Settlement.id,
            Settlement.name,
            Settlement.slug,
            Settlement.type,
            Settlement.district_id,
            func.count(Plot.id).label("plots_count"),
        )
        .join(Listing, Settlement.id == Listing.settlement_id)
        .join(Plot, Listing.id == Plot.listing_id)
        .where(Listing.is_published == True)
        .where(Plot.status == PlotStatus.active)
        .group_by(Settlement.id, Settlement.name, Settlement.slug, Settlement.type, Settlement.district_id)
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
                    "slug": district.slug,
                    "sort_order": district.sort_order,
                    "plots_count": 0,
                    "settlements": []
                }
        
        if district_id_val in districts_map:
            districts_map[district_id_val]["plots_count"] += s.plots_count
            districts_map[district_id_val]["settlements"].append(
                SettlementGroupItem(id=s.id, name=s.name, slug=s.slug, type=s.type, plots_count=s.plots_count)
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
            slug=d["slug"],
            plots_count=d["plots_count"],
            settlements=d["settlements"]
        )
        for d in sorted_districts
    ]


# === НОВАЯ АРХИТЕКТУРА ЛОКАЦИЙ ===

class LocationPublicItem(BaseModel):
    """Публичная локация с количеством объявлений."""
    id: int
    name: str
    slug: str
    type: LocationType
    settlement_type: str | None = None
    sort_order: int = 0
    name_locative: str | None = None  # SEO: "в Калининграде"
    description: str | None = None  # SEO: описание локации
    listings_count: int = 0
    children: list["LocationPublicItem"] = []

    class Config:
        from_attributes = True


@router.get("/hierarchy", response_model=list[LocationPublicItem])
async def get_locations_hierarchy(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Получить иерархию локаций с количеством объявлений.
    
    Используется для нового LocationFilter с поддержкой
    Region -> District/City -> Settlement.
    """
    # Получаем все локации (сортировка DESC - больше значение = выше)
    result = await db.execute(
        select(Location).order_by(Location.sort_order.desc(), Location.name)
    )
    all_locations = result.scalars().all()
    
    # Получаем количество объявлений для каждой локации через location_id
    counts_result = await db.execute(
        select(Listing.location_id, func.count(Listing.id))
        .join(Plot, Listing.id == Plot.listing_id)
        .where(Listing.is_published == True)
        .where(Plot.status == PlotStatus.active)
        .group_by(Listing.location_id)
    )
    listings_count_map = dict(counts_result.all())
    
    # Строим дерево с агрегацией counts
    def build_tree(parent_id: int | None) -> list[LocationPublicItem]:
        children_locs = [loc for loc in all_locations if loc.parent_id == parent_id]
        items = []
        
        for loc in children_locs:
            child_tree = build_tree(loc.id)
            
            # Собственное количество + сумма детей
            own_count = listings_count_map.get(loc.id, 0)
            children_count = sum(c.listings_count for c in child_tree)
            
            items.append(LocationPublicItem(
                id=loc.id,
                name=loc.name,
                slug=loc.slug,
                type=loc.type,
                settlement_type=loc.settlement_type,
                sort_order=loc.sort_order or 0,
                name_locative=loc.name_locative,
                description=loc.description,
                listings_count=own_count + children_count,
                children=child_tree,
            ))
        
        return items
    
    return build_tree(None)


@router.get("/resolve-new", response_model=dict)
async def resolve_location_new(
    slugs: str = Query(..., description="Слаги через запятую (region/district/settlement)"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Резолв цепочки слагов в иерархию локаций.
    
    Пример: slugs=kaliningradskaja-oblast,zelenogradskij-r-n,svetlogorsk
    Или просто: slugs=gur-evskij-r-n (для районов без региона в URL)
    """
    slug_list = [s.strip() for s in slugs.split(",") if s.strip()]
    
    result = {
        "locations": [],  # Список найденных локаций по порядку
        "leaf_id": None,  # ID самой вложенной локации
    }
    
    current_parent_id = None
    is_first_slug = True
    
    for slug in slug_list:
        query = select(Location).where(Location.slug == slug)
        
        # Для первого slug ищем на любом уровне (район/город может быть без региона в URL)
        # Для последующих — строго по parent_id
        if not is_first_slug and current_parent_id is not None:
            query = query.where(Location.parent_id == current_parent_id)
        
        loc_result = await db.execute(query)
        location = loc_result.scalar_one_or_none()
        
        if location:
            result["locations"].append({
                "id": location.id,
                "name": location.name,
                "slug": location.slug,
                "type": location.type.value,
                "settlement_type": location.settlement_type,
                "name_locative": location.name_locative,
                "description": location.description,
            })
            result["leaf_id"] = location.id
            current_parent_id = location.id
            is_first_slug = False
        else:
            break  # Прекращаем при первом не найденном слаге
    
    return result


@router.get("/resolve-v2", response_model=dict)
async def resolve_location_v2(
    slugs: str = Query(..., description="Слаги через запятую (district/settlement)"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Резолв цепочки слагов в объект локации для SmartLocationFilter.
    
    Возвращает объект location, совместимый с SmartSelectedLocation на фронте.
    Пример: slugs=zelenogradskij-r-n,svetlogorsk
    """
    from sqlalchemy.orm import joinedload
    
    slug_list = [s.strip() for s in slugs.split(",") if s.strip()]
    
    if not slug_list:
        return {"location": None}
    
    # Берём последний слаг — это целевая локация
    target_slug = slug_list[-1]
    parent_slug = slug_list[-2] if len(slug_list) > 1 else None
    
    # Ищем локацию
    query = select(Location).options(joinedload(Location.parent)).where(Location.slug == target_slug)
    
    loc_result = await db.execute(query)
    locations = loc_result.unique().scalars().all()
    
    # Если есть parent_slug, фильтруем по родителю
    location = None
    if parent_slug and len(locations) > 1:
        for loc in locations:
            if loc.parent and loc.parent.slug == parent_slug:
                location = loc
                break
    elif locations:
        location = locations[0]
    
    if not location:
        return {"location": None}
    
    return {
        "location": {
            "id": location.id,
            "name": location.name,
            "slug": location.slug,
            "type": location.type.value,
            "settlement_type": location.settlement_type,
            "parent_slug": location.parent.slug if location.parent else None,
        }
    }


# === ПОИСК ЛОКАЦИЙ ===

class LocationSearchItem(BaseModel):
    """Результат поиска локации."""
    id: int
    name: str
    slug: str
    type: str  # region, district, city, settlement
    settlement_type: str | None = None
    parent_name: str | None = None
    parent_slug: str | None = None
    listings_count: int = 0
    sort_order: int = 0

    class Config:
        from_attributes = True


class LocationSearchResponse(BaseModel):
    """Ответ поиска локаций."""
    results: list[LocationSearchItem]
    query: str
    total: int


@router.get("/search", response_model=LocationSearchResponse)
async def search_locations(
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    limit: int = Query(15, ge=1, le=50, description="Максимум результатов"),
    min_listings: int = Query(0, ge=0, description="Минимум объявлений для показа (0 = все)"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Поиск локаций по названию.
    
    Результаты сортируются по релевантности:
    1. Точное совпадение начала названия
    2. Тип локации (city > district > settlement)
    3. sort_order из БД
    4. Количество объявлений (больше = выше)
    """
    from sqlalchemy.orm import joinedload
    from sqlalchemy import case, or_
    
    search_term = q.strip().lower()
    
    # Базовый запрос — ищем по названию (ilike)
    query = (
        select(Location)
        .options(joinedload(Location.parent))
        .where(
            or_(
                Location.name.ilike(f"%{search_term}%"),
                Location.slug.ilike(f"%{search_term}%")
            )
        )
        # Исключаем регион из результатов поиска
        .where(Location.type != LocationType.REGION)
    )
    
    result = await db.execute(query)
    locations = result.unique().scalars().all()
    
    # Подсчёт объявлений для каждой локации
    counts_result = await db.execute(
        select(Listing.location_id, func.count(Listing.id))
        .join(Plot, Listing.id == Plot.listing_id)
        .where(Listing.is_published == True)
        .where(Plot.status == PlotStatus.active)
        .group_by(Listing.location_id)
    )
    listings_count_map = dict(counts_result.all())
    
    # Приоритет типов
    type_priority = {
        "city": 0,
        "district": 1,
        "settlement": 2,
        "region": 3,
    }
    
    # Сортировка результатов
    def get_sort_key(loc: Location):
        name_lower = loc.name.lower()
        
        # 1. Точное совпадение начала (меньше = лучше)
        starts_with_score = 0 if name_lower.startswith(search_term) else 1
        
        # 2. Приоритет типа
        type_score = type_priority.get(loc.type.value, 10)
        
        # 3. sort_order из БД (меньше = выше)
        sort_order_score = loc.sort_order
        
        # 4. Количество объявлений (больше = выше, поэтому отрицательное)
        listings_score = -listings_count_map.get(loc.id, 0)
        
        return (starts_with_score, type_score, sort_order_score, listings_score)
    
    # Фильтруем локации по минимальному количеству объявлений
    if min_listings > 0:
        locations = [loc for loc in locations if listings_count_map.get(loc.id, 0) >= min_listings]
    
    sorted_locations = sorted(locations, key=get_sort_key)[:limit]
    
    # Формируем ответ
    items = []
    for loc in sorted_locations:
        parent_name = None
        parent_slug = None
        if loc.parent:
            parent_name = loc.parent.name
            parent_slug = loc.parent.slug
        
        items.append(LocationSearchItem(
            id=loc.id,
            name=loc.name,
            slug=loc.slug,
            type=loc.type.value,
            settlement_type=loc.settlement_type,
            parent_name=parent_name,
            parent_slug=parent_slug,
            listings_count=listings_count_map.get(loc.id, 0),
            sort_order=loc.sort_order,
        ))
    
    return LocationSearchResponse(
        results=items,
        query=q,
        total=len(items),
    )


# === ПОЛУЧЕНИЕ ЛОКАЦИИ ПО ID ===
# ВАЖНО: Этот роут должен быть ПОСЛЕДНИМ, чтобы не перехватывать /search, /resolve-v2 и т.д.

@router.get("/{location_id}", response_model=dict)
async def get_location_by_id(
    location_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Получить локацию по ID.
    
    Используется для редиректа старых URL с ?settlements= на гео-URL.
    """
    from sqlalchemy.orm import joinedload
    
    query = select(Location).options(joinedload(Location.parent)).where(Location.id == location_id)
    result = await db.execute(query)
    location = result.unique().scalar_one_or_none()
    
    if not location:
        return {"error": "Location not found"}
    
    return {
        "id": location.id,
        "name": location.name,
        "slug": location.slug,
        "type": location.type.value,
        "settlement_type": location.settlement_type,
        "parent_slug": location.parent.slug if location.parent else None,
        "parent_name": location.parent.name if location.parent else None,
    }


@router.get("/slugs/all", response_model=list[dict])
async def get_all_location_slugs(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Получить список всех путей локаций для sitemap geo-страниц.
    
    Возвращает массив объектов:
    {
        "path": ["zelenogradskij-r-n", "svetlogorsk"],
        "listings_count": 15
    }
    """
    from sqlalchemy.orm import aliased
    from app.models.listing import Listing
    
    # Получаем все локации с количеством листингов
    locations_result = await db.execute(
        select(Location)
        .where(Location.type != "region")  # Регион не включаем
    )
    all_locations = locations_result.scalars().all()
    
    # Подсчитываем листинги для каждой локации
    listings_count_result = await db.execute(
        select(Listing.location_id, func.count(Listing.id).label("count"))
        .where(Listing.is_published == True)
        .group_by(Listing.location_id)
    )
    listings_by_location = {row.location_id: row.count for row in listings_count_result.all()}
    
    # Строим словарь локаций для быстрого доступа
    locations_dict = {loc.id: loc for loc in all_locations}
    
    # Рекурсивная функция для получения пути от локации до корня
    def get_path(loc_id: int) -> list[str]:
        path: list[str] = []
        current_id = loc_id
        max_depth = 10
        
        while current_id and max_depth > 0:
            loc = locations_dict.get(current_id)
            if not loc:
                # Проверяем родителя (регион может быть не в словаре)
                parent_result_sync = None
                break
            
            # Регион пропускаем
            if loc.type != "region":
                path.insert(0, loc.slug)
            
            current_id = loc.parent_id
            max_depth -= 1
        
        return path
    
    # Рекурсивный подсчёт листингов с учётом детей
    def count_with_children(loc_id: int) -> int:
        own_count = listings_by_location.get(loc_id, 0)
        children_count = sum(
            count_with_children(child.id)
            for child in all_locations
            if child.parent_id == loc_id
        )
        return own_count + children_count
    
    # Формируем результат
    result = []
    for loc in all_locations:
        path = get_path(loc.id)
        if not path:
            continue
            
        total_count = count_with_children(loc.id)
        
        # Включаем только локации с объявлениями
        if total_count > 0:
            result.append({
                "path": path,
                "listings_count": total_count,
            })
    
    return result
