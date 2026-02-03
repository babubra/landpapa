"""
Скрипт для очистки пустых районов из таблицы locations.

Удаляет районы (DISTRICT), у которых нет:
- Дочерних локаций (settlements)
- Объявлений (listings)

Запуск: cd backend && venv/Scripts/python.exe -m app.scripts.cleanup_empty_districts
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
        # 1. Найдём пустые районы
        print("\n=== Поиск пустых районов ===")
        
        # Районы без детей и без объявлений
        empty_districts = session.execute(text("""
            SELECT d.id, d.name, d.slug,
                   (SELECT COUNT(*) FROM locations c WHERE c.parent_id = d.id) as children_count,
                   (SELECT COUNT(*) FROM listings l WHERE l.location_id = d.id) as listings_count
            FROM locations d
            WHERE d.type = 'DISTRICT'
            ORDER BY d.name
        """)).fetchall()
        
        to_delete = []
        to_keep = []
        
        for d in empty_districts:
            if d.children_count == 0 and d.listings_count == 0:
                to_delete.append(d)
                print(f"  ❌ Удалить: {d.name} (детей: {d.children_count}, объявл.: {d.listings_count})")
            else:
                to_keep.append(d)
                print(f"  ✅ Оставить: {d.name} (детей: {d.children_count}, объявл.: {d.listings_count})")
        
        print(f"\nИтого: {len(to_delete)} к удалению, {len(to_keep)} к сохранению")
        
        if not to_delete:
            print("Нет пустых районов для удаления.")
            return
        
        # 2. Удаляем пустые районы
        confirm = input("\nУдалить пустые районы? (y/n): ")
        if confirm.lower() != 'y':
            print("Отменено.")
            return
        
        for d in to_delete:
            session.execute(text("DELETE FROM locations WHERE id = :id"), {"id": d.id})
        
        session.commit()
        print(f"\n✅ Удалено {len(to_delete)} пустых районов")
        
        # 3. Итоговая статистика
        stats = session.execute(text("""
            SELECT type, COUNT(*) as cnt
            FROM locations
            GROUP BY type
            ORDER BY type
        """)).fetchall()
        
        print("\n=== Итоговая статистика ===")
        for s in stats:
            print(f"  {s.type}: {s.cnt}")


if __name__ == "__main__":
    main()
