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
        # 1. Получаем маппинг старых districts -> новых locations (районов)
        print("\n=== Шаг 1: Маппинг районов ===")
        
        # Старые districts
        old_districts = session.execute(text(
            "SELECT id, name, slug FROM districts ORDER BY name"
        )).fetchall()
        
        # Новые locations (только district)
        new_districts = session.execute(text(
            "SELECT id, name, slug FROM locations WHERE type = 'DISTRICT' ORDER BY name"
        )).fetchall()
        
        print(f"Старых districts: {len(old_districts)}")
        print(f"Новых locations (district): {len(new_districts)}")
        
        # Создаём маппинг по slug (более надёжно чем по имени)
        old_to_new_district = {}
        for old in old_districts:
            # Ищем соответствие по slug или части имени
            old_slug_clean = old.slug.replace("-", "").replace("_", "").lower()
            old_name_clean = old.name.lower().replace(" р-н", "").replace(" район", "").strip()
            
            for new in new_districts:
                new_slug_clean = new.slug.replace("-", "").replace("_", "").lower()
                new_name_clean = new.name.lower().replace(" район", "").strip()
                
                if old_slug_clean in new_slug_clean or new_slug_clean in old_slug_clean:
                    old_to_new_district[old.id] = new.id
                    print(f"  Маппинг: {old.name} (id={old.id}) -> {new.name} (id={new.id})")
                    break
                elif old_name_clean in new_name_clean or new_name_clean in old_name_clean:
                    old_to_new_district[old.id] = new.id
                    print(f"  Маппинг: {old.name} (id={old.id}) -> {new.name} (id={new.id}) [по имени]")
                    break
            
            if old.id not in old_to_new_district:
                print(f"  ⚠️ НЕ НАЙДЕН МАППИНГ: {old.name} (slug={old.slug})")
        
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
            # Находим parent_id (район в новой таблице)
            if s.district_id not in old_to_new_district:
                print(f"  ⚠️ Пропуск: {s.name} (district_id={s.district_id} не найден)")
                skipped_count += 1
                continue
            
            parent_id = old_to_new_district[s.district_id]
            
            # Проверяем, не существует ли уже
            existing = session.execute(text(
                "SELECT id FROM locations WHERE slug = :slug AND parent_id = :parent_id"
            ), {"slug": s.slug, "parent_id": parent_id}).fetchone()
            
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
