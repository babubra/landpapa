"""
Миграционный скрипт для переноса данных из старых таблиц
districts/settlements в новую иерархическую таблицу locations.

Также обновляет location_id в listings на основе settlement_id.

Запуск:
    python -m app.scripts.migrate_locations
"""

import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_engine, AsyncSessionLocal
from app.models.location import District, Settlement, Location, LocationType


async def migrate_locations():
    """Миграция данных."""
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("Миграция локаций: districts/settlements -> locations")
        print("=" * 60)
        
        # 1. Проверяем, есть ли уже данные
        existing_count = await db.execute(select(Location).limit(1))
        if existing_count.scalar_one_or_none():
            print("\n⚠️  Таблица locations уже содержит данные.")
            print("Проверяем, нужна ли миграция listings...")
            await migrate_listings(db)
            return
        
        # 2. Создаём регион (Калининградская область)
        print("\n1. Создаём регион...")
        region = Location(
            name="Калининградская область",
            slug="kaliningradskaja-oblast",
            type=LocationType.REGION,
            parent_id=None,
            sort_order=0,
        )
        db.add(region)
        await db.flush()
        print(f"   ✓ Создан регион: {region.name} (id={region.id})")
        
        # 3. Мигрируем районы
        print("\n2. Мигрируем районы...")
        districts_result = await db.execute(
            select(District).order_by(District.sort_order, District.name)
        )
        districts = districts_result.scalars().all()
        
        district_id_map = {}  # old_id -> new_id
        
        for d in districts:
            # Определяем тип: Калининград = CITY, остальные = DISTRICT
            loc_type = LocationType.CITY if d.slug == "kaliningrad" else LocationType.DISTRICT
            
            location = Location(
                name=d.name,
                slug=d.slug,
                type=loc_type,
                parent_id=region.id,
                fias_id=d.fias_id,
                sort_order=d.sort_order,
            )
            db.add(location)
            await db.flush()
            
            district_id_map[d.id] = location.id
            print(f"   ✓ {d.name} -> id={location.id} ({loc_type.value})")
        
        print(f"   Итого районов: {len(districts)}")
        
        # 4. Мигрируем населённые пункты
        print("\n3. Мигрируем населённые пункты...")
        settlements_result = await db.execute(
            select(Settlement).order_by(Settlement.sort_order, Settlement.name)
        )
        settlements = settlements_result.scalars().all()
        
        settlement_to_location = {}  # old_settlement_id -> new_location_id
        
        for s in settlements:
            parent_loc_id = district_id_map.get(s.district_id)
            
            if not parent_loc_id:
                print(f"   ⚠️  Пропущен {s.name}: район {s.district_id} не найден")
                continue
            
            location = Location(
                name=s.name,
                slug=s.slug,
                type=LocationType.SETTLEMENT,
                parent_id=parent_loc_id,
                fias_id=s.fias_id,
                settlement_type=s.type,  # "г", "пос", "с"
                sort_order=s.sort_order,
            )
            db.add(location)
            await db.flush()
            
            settlement_to_location[s.id] = location.id
            print(f"   ✓ {s.type or ''} {s.name} -> id={location.id}")
        
        print(f"   Итого населённых пунктов: {len(settlements)}")
        
        await db.commit()
        print("\n✅ Миграция локаций завершена!")
        
        # 5. Мигрируем location_id в listings
        await migrate_listings(db, settlement_to_location)


async def migrate_listings(
    db: AsyncSession, 
    settlement_to_location: dict[int, int] | None = None
):
    """Обновляем location_id в listings на основе settlement_id."""
    from app.models.listing import Listing
    
    print("\n4. Обновляем location_id в listings...")
    
    # Если map не передан, строим его заново
    if settlement_to_location is None:
        settlement_to_location = {}
        
        # Получаем все settlements
        settlements_result = await db.execute(select(Settlement))
        settlements = settlements_result.scalars().all()
        
        for s in settlements:
            # Ищем соответствующую Location по slug или fias_id
            if s.fias_id:
                loc_result = await db.execute(
                    select(Location).where(Location.fias_id == s.fias_id)
                )
            else:
                loc_result = await db.execute(
                    select(Location).where(Location.slug == s.slug)
                )
            
            location = loc_result.scalar_one_or_none()
            if location:
                settlement_to_location[s.id] = location.id
    
    # Получаем listings с settlement_id, но без location_id
    listings_result = await db.execute(
        select(Listing).where(
            Listing.settlement_id.isnot(None),
            Listing.location_id.is_(None)
        )
    )
    listings = listings_result.scalars().all()
    
    updated = 0
    for listing in listings:
        new_loc_id = settlement_to_location.get(listing.settlement_id)
        if new_loc_id:
            listing.location_id = new_loc_id
            updated += 1
    
    if updated > 0:
        await db.commit()
        print(f"   ✓ Обновлено listings: {updated}")
    else:
        print("   ✓ Нет listings для обновления")
    
    print("\n✅ Миграция завершена!")


async def main():
    """Точка входа."""
    await migrate_locations()


if __name__ == "__main__":
    asyncio.run(main())
