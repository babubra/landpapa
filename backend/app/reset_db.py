"""
Скрипт для пересоздания базы данных с чистого листа.
Создаёт только администратора admin / Admin123.

Запуск:
    python -m app.reset_db
"""

from app.database import engine, SessionLocal, Base
from app.models.admin_user import AdminUser
from app.auth import hash_password

# Импортируем все модели чтобы Base.metadata знал о них
from app.models.news import News
from app.models.reference import Reference
from app.models.realtor import Realtor
from app.models.owner import Owner
from app.models.location import District, Settlement
from app.models.listing import Listing
from app.models.plot import Plot


def reset_database():
    """Удалить все таблицы и создать заново."""
    print("Удаляем все таблицы...")
    Base.metadata.drop_all(bind=engine)
    
    print("Создаём таблицы...")
    Base.metadata.create_all(bind=engine)
    
    print("Создаём администратора...")
    db = SessionLocal()
    try:
        admin = AdminUser(
            username="admin",
            password_hash=hash_password("Admin123"),
            display_name="Администратор",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("✓ Создан админ: admin / Admin123")
    finally:
        db.close()
    
    print("\n✓ База данных пересоздана!")


if __name__ == "__main__":
    confirm = input("ВНИМАНИЕ: Все данные будут удалены! Продолжить? (yes/no): ")
    if confirm.lower() == "yes":
        reset_database()
    else:
        print("Отменено.")
