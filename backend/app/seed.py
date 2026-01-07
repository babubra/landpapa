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
            "value": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 733 1093"><path d="M 369.0 1091.5 L 234.5 901.0 L 110.5 690.0 L 68.5 603.0 L 34.5 517.0 L 12.5 438.0 L 4.5 375.0 L 8.5 309.0 L 26.5 239.0 L 57.5 175.0 L 100.5 118.0 L 151.0 72.5 L 219.0 32.5 L 268.0 14.5 L 342.0 1.5 L 415.0 3.5 L 496.0 23.5 L 556.0 52.5 L 608.0 90.5 L 662.5 150.0 L 699.5 213.0 L 719.5 268.0 L 731.5 338.0 L 729.5 407.0 L 715.5 474.0 L 692.5 544.0 L 654.5 633.0 L 600.5 738.0 L 536.5 847.0 L 451.5 977.0 L 369.0 1091.5 Z" fill="currentColor"/><circle cx="368.5" cy="367.5" r="181.0" fill="#ff3948"/></svg>',
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
