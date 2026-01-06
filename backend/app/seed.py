"""
Скрипт для наполнения базы данных базовыми данными.

Запуск:
    python -m app.seed
"""

from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models.reference import Reference
from app.models.admin_user import AdminUser
from app.models.setting import Setting
from app.auth import hash_password


# === Справочники ===

LAND_USE_DATA = [
    {"code": "izhs", "name": "ИЖС", "description": "Индивидуальное жилищное строительство"},
    {"code": "lph", "name": "ЛПХ", "description": "Личное подсобное хозяйство"},
    {"code": "snt", "name": "СНТ", "description": "Садовое некоммерческое товарищество"},
    {"code": "dnp", "name": "ДНП", "description": "Дачное некоммерческое партнёрство"},
    {"code": "farm", "name": "СХ", "description": "Для сельскохозяйственного использования"},
    {"code": "commercial", "name": "Коммерческое", "description": "Для коммерческого использования"},
]

LAND_CATEGORY_DATA = [
    {"code": "settlement", "name": "Земли населённых пунктов"},
    {"code": "agricultural", "name": "Земли сельхозназначения"},
    {"code": "industrial", "name": "Земли промышленности"},
    {"code": "forest", "name": "Земли лесного фонда"},
]


def seed_references(db: Session):
    """Создать справочники: виды разрешённого использования и категории земель."""
    existing = db.query(Reference).count()
    if existing > 0:
        print(f"Справочники уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём справочники...")
    
    # Виды разрешённого использования
    for data in LAND_USE_DATA:
        db.add(Reference(type="land_use", **data))
    
    # Категории земель
    for data in LAND_CATEGORY_DATA:
        db.add(Reference(type="land_category", **data))
    
    db.commit()
    print(f"Создано {len(LAND_USE_DATA)} видов использования и {len(LAND_CATEGORY_DATA)} категорий.")


def seed_admin(db: Session):
    """Создать админа по умолчанию."""
    existing = db.query(AdminUser).count()
    if existing > 0:
        print(f"Админы уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём администратора...")
    admin = AdminUser(
        username="admin",
        password_hash=hash_password("Admin123"),
        display_name="Администратор",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print("Создан админ: admin / Admin123")


def seed_settings(db: Session):
    """Создать настройки по умолчанию."""
    default_settings = [
        {
            "key": "nspd_proxy",
            "value": "",
            "description": "Прокси для NSPD клиента (формат: user:pass@host:port)"
        },
        {
            "key": "nspd_timeout",
            "value": "30",
            "description": "Таймаут для NSPD запросов в секундах"
        },
        {
            "key": "dadata_api_key",
            "value": "",
            "description": "API ключ для DaData (получить на dadata.ru)"
        },
        # Настройки сайта
        {
            "key": "site_title",
            "value": "КалининградЗем",
            "description": "Название сайта"
        },
        {
            "key": "site_subtitle",
            "value": "Земельные участки",
            "description": "Подзаголовок сайта"
        },
        {
            "key": "site_phone",
            "value": "+7 (4012) 12-34-56",
            "description": "Телефон в шапке сайта"
        },
        {
            "key": "site_logo",
            "value": "",
            "description": "Логотип сайта (SVG код). Вставьте код <svg> с fill=\"currentColor\""
        },
        # Главная страница
        {
            "key": "hero_title",
            "value": "Земельные участки в Калининградской области",
            "description": "Заголовок Hero-секции"
        },
        {
            "key": "hero_subtitle",
            "value": "Найдите идеальный участок для строительства дома, ведения хозяйства или инвестиций",
            "description": "Подзаголовок Hero-секции"
        },
        {
            "key": "hero_image",
            "value": "",
            "description": "Фоновое изображение Hero (URL)"
        },
        # Изображения
        {
            "key": "placeholder_image",
            "value": "",
            "description": "Изображение-заглушка для карточек объявлений (URL)"
        },
    ]
    
    created = 0
    for setting_data in default_settings:
        existing = db.query(Setting).filter(Setting.key == setting_data["key"]).first()
        if not existing:
            db.add(Setting(**setting_data))
            created += 1
    
    if created > 0:
        db.commit()
        print(f"Создано {created} настроек по умолчанию.")
    else:
        print("Настройки уже существуют. Пропускаем.")


def main():
    """Главная функция."""
    print("Создаём таблицы...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_references(db)
        seed_admin(db)
        seed_settings(db)
    finally:
        db.close()
    
    print("\nГотово!")


if __name__ == "__main__":
    main()
