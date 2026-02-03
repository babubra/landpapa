"""
Скрипт для исправления пропущенных записей из старого district "Калининград".

Запуск: cd backend && venv/Scripts/python.exe -m app.scripts.fix_kaliningrad
"""
import os
from pathlib import Path
from dotenv import load_dotenv

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
        # Найдём пропущенные settlements из district "Калининград"
        print("\n=== Пропущенные settlements ===")
        
        settlements = session.execute(text("""
            SELECT s.id, s.name, s.slug, s.type, s.fias_id
            FROM settlements s
            JOIN districts d ON s.district_id = d.id
            WHERE d.name = 'Калининград'
            ORDER BY s.name
        """)).fetchall()
        
        print(f"Найдено: {len(settlements)}")
        for s in settlements:
            print(f"  {s.id}: {s.name} (type={s.type}, slug={s.slug})")
        
        # Маппинг: города уже есть как CITY, остальные привязываем к городам или Зеленоградскому
        # На основе географии:
        # - Пионерский, Синявино → Зеленоградский район (или городской округ Пионерский)
        # - Покровское → Зеленоградский район
        
        # Получаем ID городов и Зеленоградского района
        cities = session.execute(text("""
            SELECT id, name FROM locations WHERE type = 'CITY'
        """)).fetchall()
        city_map = {c.name.lower(): c.id for c in cities}
        print(f"\nГорода: {city_map}")
        
        zelenogradsk = session.execute(text("""
            SELECT id FROM locations WHERE slug = 'zelenogradskij-r-n'
        """)).fetchone()
        zelenogradsk_id = zelenogradsk.id if zelenogradsk else None
        print(f"Зеленоградский район ID: {zelenogradsk_id}")
        
        # Маппинг settlement_id -> location_id
        settlement_to_location = {}
        
        for s in settlements:
            name_lower = s.name.lower()
            
            # Если это город — используем существующий CITY
            if name_lower in city_map:
                settlement_to_location[s.id] = city_map[name_lower]
                print(f"  {s.name} -> CITY (id={city_map[name_lower]})")
            else:
                # Покровское, Синявино — привязываем к Зеленоградскому району
                if zelenogradsk_id:
                    # Создаём как settlement в Зеленоградском районе
                    existing = session.execute(text("""
                        SELECT id FROM locations WHERE slug = :slug AND parent_id = :parent_id
                    """), {"slug": s.slug, "parent_id": zelenogradsk_id}).fetchone()
                    
                    if existing:
                        settlement_to_location[s.id] = existing.id
                        print(f"  {s.name} -> уже существует (id={existing.id})")
                    else:
                        result = session.execute(text("""
                            INSERT INTO locations (name, slug, type, settlement_type, parent_id, fias_id, sort_order)
                            VALUES (:name, :slug, 'SETTLEMENT', :settlement_type, :parent_id, :fias_id, 0)
                            RETURNING id
                        """), {
                            "name": s.name,
                            "slug": s.slug,
                            "settlement_type": s.type,
                            "parent_id": zelenogradsk_id,
                            "fias_id": s.fias_id
                        })
                        new_id = result.fetchone()[0]
                        settlement_to_location[s.id] = new_id
                        print(f"  {s.name} -> создан в Зеленоградском районе (id={new_id})")
        
        session.commit()
        
        # Обновляем listings
        print("\n=== Обновление listings ===")
        updated = 0
        for old_id, new_id in settlement_to_location.items():
            result = session.execute(text("""
                UPDATE listings 
                SET location_id = :location_id 
                WHERE settlement_id = :settlement_id AND location_id IS NULL
            """), {"location_id": new_id, "settlement_id": old_id})
            updated += result.rowcount
        
        session.commit()
        print(f"Обновлено listings: {updated}")
        
        # Итог
        print("\n=== Итоговая статистика ===")
        stats = session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(location_id) as with_location
            FROM listings
        """)).fetchone()
        print(f"Listings: {stats.total} всего, {stats.with_location} с location_id")


if __name__ == "__main__":
    main()
