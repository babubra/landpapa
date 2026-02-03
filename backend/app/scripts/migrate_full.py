"""
Скрипт для полной миграции данных из settlements в locations.

Запуск: cd backend && venv/Scripts/python.exe -m app.scripts.migrate_full
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Загрузка .env
backend_dir = Path(__file__).parent.parent.parent
load_dotenv(backend_dir / ".env")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kaliningrad_land")
if "sqlite" in DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"


def main():
    print(f"Подключение к: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)
    
    with Session(engine) as session:
        # 0. Проверяем/Создаём Регион
        region = session.execute(text("SELECT id FROM locations WHERE type = 'REGION' LIMIT 1")).fetchone()
        if not region:
            print("\n=== Шаг 0: Создание региона ===")
            result = session.execute(text("""
                INSERT INTO locations (name, slug, type, parent_id, sort_order)
                VALUES ('Калининградская область', 'kaliningradskaja-oblast', 'REGION', NULL, 0)
                RETURNING id
            """))
            region_id = result.fetchone()[0]
            print(f"   ✓ Создан регион (id={region_id})")
        else:
            region_id = region.id

        # 1. Получаем маппинг старых districts -> новых locations (районов)
        print("\n=== Шаг 1: Миграция/Маппинг районов ===")
        
        old_districts = session.execute(text(
            "SELECT id, name, slug, fias_id, sort_order FROM districts ORDER BY name"
        )).fetchall()
        
        old_to_new_district = {}
        
        for old in old_districts:
            # Ищем существующий
            existing = session.execute(text(
                "SELECT id, slug FROM locations WHERE slug = :slug AND type IN ('DISTRICT', 'CITY')"
            ), {"slug": old.slug}).fetchone()
            
            if existing:
                # Если нашли - обновляем маппинг
                old_to_new_district[old.id] = existing.id
                print(f"  ✓ Найден: {old.name} (id={existing.id})")
                
                # Обновляем slug если отличается
                if existing.slug != old.slug:
                    session.execute(text(
                        "UPDATE locations SET slug = :slug WHERE id = :id"
                    ), {"slug": old.slug, "id": existing.id})
                    print(f"    🔄 Slug обновлен: {existing.slug} -> {old.slug}")
            else:
                # Если не нашли - создаём
                # Определяем тип: Калининград = CITY, остальные = DISTRICT
                loc_type = 'CITY' if old.slug == 'kaliningrad' else 'DISTRICT'
                
                result = session.execute(text("""
                    INSERT INTO locations (name, slug, type, parent_id, fias_id, sort_order)
                    VALUES (:name, :slug, :type, :parent_id, :fias_id, :sort_order)
                    RETURNING id
                """), {
                    "name": old.name,
                    "slug": old.slug, # Используем старый slug!
                    "type": loc_type,
                    "parent_id": region_id,
                    "fias_id": old.fias_id,
                    "sort_order": old.sort_order
                })
                new_id = result.fetchone()[0]
                old_to_new_district[old.id] = new_id
                print(f"  ✓ Создан: {old.name} (id={new_id})")
        
        session.commit() # Сохраняем районы перед обработкой поселков
        
        # 2. Переносим settlements в locations
        print("\n=== Шаг 2: Миграция населённых пунктов ===")
        
        settlements = session.execute(text(
            "SELECT id, name, slug, type, district_id, fias_id FROM settlements ORDER BY district_id, name"
        )).fetchall()
        
        print(f"Всего settlements для миграции: {len(settlements)}")
        
        # Маппинг старых settlement_id -> новых location_id
        settlement_to_location = {}
        created_count = 0
        skipped_count = 0
        
        
        for s in settlements:
            # === СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ СЛОЖНЫХ СЛУЧАЕВ ===
            
            # 1. Пионерский -> CITY под регионом
            if s.slug == 'pionerskij':
                print(f"  ✨ Special: Пионерский -> CITY")
                # Создаем/Ищем как CITY
                existing = session.execute(text(
                    "SELECT id FROM locations WHERE slug = 'pionerskij' AND type = 'CITY'"
                )).fetchone()
                
                if not existing:
                    result = session.execute(text("""
                        INSERT INTO locations (name, slug, type, parent_id, fias_id, sort_order)
                        VALUES (:name, :slug, 'CITY', :parent_id, :fias_id, 0)
                        RETURNING id
                    """), {
                        "name": s.name,
                        "slug": s.slug,
                        "parent_id": region_id,
                        "fias_id": s.fias_id or '9fee1c1b-9d14-42ea-8ff9-2e903501d43d'
                    })
                    settlement_to_location[s.id] = result.fetchone()[0]
                else:
                    settlement_to_location[s.id] = existing.id
                continue

            # 2. Янтарный -> CITY (пгт) под регионом, slug исправляем на yantarnyj
            if s.slug == 'antarnyj' or s.slug == 'yantarnyj':
                print(f"  ✨ Special: Янтарный -> CITY (yantarnyj)")
                existing = session.execute(text(
                    "SELECT id FROM locations WHERE slug = 'yantarnyj' AND type IN ('CITY', 'DISTRICT')"
                )).fetchone()
                
                if not existing:
                    result = session.execute(text("""
                        INSERT INTO locations (name, slug, type, parent_id, fias_id, sort_order)
                        VALUES (:name, 'yantarnyj', 'CITY', :parent_id, :fias_id, 0)
                        RETURNING id
                    """), {
                        "name": "Янтарный",
                        "parent_id": region_id,
                        "fias_id": s.fias_id or '234f6132-e2d9-4373-8dc3-cc56b5603b8f'
                    })
                    settlement_to_location[s.id] = result.fetchone()[0]
                else:
                    settlement_to_location[s.id] = existing.id
                continue

            # 3. Калининград (settlement) -> мапим на город Калининград
            if s.slug == 'kaliningrad':
                print(f"  ✨ Special: Калининград (settlement) -> Калининград (CITY)")
                # Ищем город Калининград (должен быть создан в шаге 1)
                kal_city = session.execute(text(
                    "SELECT id FROM locations WHERE slug = 'kaliningrad' AND type = 'CITY'"
                )).fetchone()
                if kal_city:
                    settlement_to_location[s.id] = kal_city.id
                else:
                     print("  ⚠️ ERR: Город Калининград не найден!")
                continue

            # 4. Покровское и Синявино -> переносим в Янтарный
            if s.slug in ['pokrovskoe', 'sinavino']:
                 print(f"  ✨ Special: {s.name} -> в Янтарный")
                 # Ищем Янтарный (должен быть уже создан/найден выше, но порядок не гарантирован, поэтому ищем в БД)
                 yantarnyj = session.execute(text(
                    "SELECT id FROM locations WHERE slug = 'yantarnyj' LIMIT 1"
                 )).fetchone()
                 
                 if yantarnyj:
                     parent_id = yantarnyj.id
                 else:
                     # Если Янтарный еще не обработан (порядок сортировки), создаем его
                     print(f"    ⚠️ Янтарный не найден, создаем parent...")
                     result = session.execute(text("""
                        INSERT INTO locations (name, slug, type, parent_id, fias_id, sort_order)
                        VALUES ('Янтарный', 'yantarnyj', 'CITY', :parent_id, '234f6132-e2d9-4373-8dc3-cc56b5603b8f', 0)
                        RETURNING id
                     """), {"parent_id": region_id})
                     parent_id = result.fetchone()[0]
                 
                 # Теперь создаем поселок под Янтарным
                 # ... продолжаем стандартную логику но с новым parent_id
            
            else:
                # Стандартная логика
                if s.district_id not in old_to_new_district:
                    print(f"  ⚠️ Пропуск: {s.name} (district_id={s.district_id} не найден)")
                    skipped_count += 1
                    continue
                parent_id = old_to_new_district[s.district_id]

            # === КОНЕЦ СПЕЦИАЛЬНОЙ ЛОГИКИ ===

            existing = None
            
            # 1. Попытка по FIAS ID (самая надежная)
            if s.fias_id:
                existing = session.execute(text(
                    "SELECT id FROM locations WHERE fias_id = :fias_id"
                ), {"fias_id": s.fias_id}).fetchone()
            
            # 2. Попытка по Slug + Parent (строгая иерархия)
            if not existing:
                existing = session.execute(text(
                    "SELECT id FROM locations WHERE slug = :slug AND parent_id = :parent_id"
                ), {"slug": s.slug, "parent_id": parent_id}).fetchone()
            
            # 3. Попытка по Slug глобально (если город был "повышен" до CITY или перемещен)
            if not existing:
                existing = session.execute(text(
                    "SELECT id FROM locations WHERE slug = :slug AND type IN ('CITY', 'DISTRICT') LIMIT 1"
                ), {"slug": s.slug}).fetchone()
            
            if existing:
                settlement_to_location[s.id] = existing.id
                continue
            
            # Создаём новую запись
            result = session.execute(text("""
                INSERT INTO locations (name, slug, type, settlement_type, parent_id, fias_id, sort_order)
                VALUES (:name, :slug, 'SETTLEMENT', :settlement_type, :parent_id, :fias_id, 0)
                RETURNING id
            """), {
                "name": s.name,
                "slug": s.slug,
                "settlement_type": s.type,
                "parent_id": parent_id,
                "fias_id": s.fias_id
            })
            new_id = result.fetchone()[0]
            settlement_to_location[s.id] = new_id
            created_count += 1
        
        session.commit()
        print(f"Создано: {created_count}, пропущено: {skipped_count}")
        
        # 3. Обновляем location_id в listings
        print("\n=== Шаг 3: Обновление listings.location_id ===")
        
        updated_count = 0
        for old_settlement_id, new_location_id in settlement_to_location.items():
            result = session.execute(text("""
                UPDATE listings 
                SET location_id = :location_id 
                WHERE settlement_id = :settlement_id AND location_id IS NULL
            """), {"location_id": new_location_id, "settlement_id": old_settlement_id})
            updated_count += result.rowcount
        
        session.commit()
        print(f"Обновлено listings: {updated_count}")
        
        # 4. Итоговая статистика
        print("\n=== Итоговая статистика ===")
        stats = session.execute(text("""
            SELECT 
                (SELECT COUNT(*) FROM locations) as total_locations,
                (SELECT COUNT(*) FROM locations WHERE type = 'SETTLEMENT') as settlements,
                (SELECT COUNT(*) FROM listings WHERE location_id IS NOT NULL) as listings_with_location
        """)).fetchone()
        print(f"Всего locations: {stats.total_locations}")
        print(f"Из них settlements: {stats.settlements}")
        print(f"Listings с location_id: {stats.listings_with_location}")


if __name__ == "__main__":
    main()
