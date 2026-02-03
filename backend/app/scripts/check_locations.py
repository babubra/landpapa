"""
Скрипт для проверки и исправления данных в таблице locations.
Запуск: cd backend && venv/Scripts/python.exe -m app.scripts.check_locations
"""
import os
import sys
from pathlib import Path

# Находим backend директорию
backend_dir = Path(__file__).parent.parent.parent
env_file = backend_dir / ".env"

from dotenv import load_dotenv
load_dotenv(env_file)

from sqlalchemy import create_engine, text

# Явно указываем PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kaliningrad_land")
if "sqlite" in DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"

def main():
    db_host = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
    print(f"Подключение к: {db_host}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # 1. Проверяем locations
        print("\n=== Таблица LOCATIONS ===")
        result = conn.execute(text("""
            SELECT id, name, type, parent_id, settlement_type, slug 
            FROM locations 
            ORDER BY parent_id NULLS FIRST, type, name 
            LIMIT 30
        """))
        rows = result.fetchall()
        print(f"Всего записей: (показаны первые 30)")
        for row in rows:
            print(f"  {row.id:3}: {str(row.type):12} | {row.name:35} | parent={row.parent_id} | st_type={row.settlement_type}")
        
        # 2. Проверяем settlements (старая таблица)
        print("\n=== Таблица SETTLEMENTS (старая) ===")
        result = conn.execute(text("""
            SELECT s.id, s.name, s.type, d.name as district_name
            FROM settlements s
            LEFT JOIN districts d ON s.district_id = d.id
            ORDER BY d.name, s.name
            LIMIT 20
        """))
        rows = result.fetchall()
        for row in rows:
            print(f"  {row.id:3}: {row.name:25} | type={row.type:5} | district={row.district_name}")
        
        # 3. Статистика listings
        print("\n=== LISTINGS статистика ===")
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(settlement_id) as with_settlement,
                COUNT(location_id) as with_location
            FROM listings
        """))
        row = result.fetchone()
        print(f"  Всего: {row.total}, с settlement_id: {row.with_settlement}, с location_id: {row.with_location}")


if __name__ == "__main__":
    main()
