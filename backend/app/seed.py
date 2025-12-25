"""
Скрипт для наполнения базы данных тестовыми данными.

Запуск:
    python -m app.seed
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models.news import News
from app.models.reference import Reference
from app.models.realtor import Realtor
from app.models.owner import Owner
from app.models.location import District, Settlement
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.models.admin_user import AdminUser
from app.auth import hash_password


# === Справочники ===

LAND_USE_DATA = [
    {"code": "izhs", "name": "ИЖС", "description": "Индивидуальное жилищное строительство"},
    {"code": "lph", "name": "ЛПХ", "description": "Личное подсобное хозяйство"},
    {"code": "snt", "name": "СНТ", "description": "Садовое некоммерческое товарищество"},
    {"code": "dnp", "name": "ДНП", "description": "Дачное некоммерческое партнёрство"},
    {"code": "farm", "name": "Фермерское", "description": "Для ведения фермерского хозяйства"},
    {"code": "commercial", "name": "Коммерческое", "description": "Для коммерческого использования"},
]

LAND_CATEGORY_DATA = [
    {"code": "settlement", "name": "Земли населённых пунктов"},
    {"code": "agricultural", "name": "Земли сельхозназначения"},
    {"code": "industrial", "name": "Земли промышленности"},
    {"code": "forest", "name": "Земли лесного фонда"},
]


# === Тестовые новости ===

SAMPLE_NEWS = [
    {
        "slug": "otkryt-novyj-poselok-v-zelenogradskom-rajone",
        "title": "Открыт новый коттеджный посёлок в Зеленоградском районе",
        "excerpt": "В живописном месте у моря стартовали продажи участков под ИЖС с готовыми коммуникациями.",
        "content": "<p>Рады сообщить об открытии нового коттеджного посёлка!</p>",
        "meta_title": "Новый посёлок в Зеленоградске",
        "meta_description": "Продажа участков в новом посёлке.",
    },
    {
        "slug": "izmeneniya-materinskogo-kapitala-2025",
        "title": "Изменения в программе материнского капитала в 2025 году",
        "excerpt": "Какие новые возможности открываются для покупателей земельных участков.",
        "content": "<p>С 1 января 2025 года вступают в силу изменения.</p>",
        "meta_title": "Материнский капитал 2025",
        "meta_description": "Изменения в программе материнского капитала.",
    },
    {
        "slug": "kak-vybrat-uchastok",
        "title": "Как выбрать участок для строительства дома",
        "excerpt": "Полезные советы от наших экспертов.",
        "content": "<p>Выбор участка — важный шаг.</p>",
        "meta_title": "Как выбрать участок",
        "meta_description": "Советы по выбору участка.",
    },
    {
        "slug": "akciya-gusevskij-rajon",
        "title": "Специальные условия на участки в Гусевском районе",
        "excerpt": "До конца года действуют выгодные предложения.",
        "content": "<p>Скидка 15% на участки от 15 соток!</p>",
        "meta_title": "Акция Гусевский район",
        "meta_description": "Скидки на участки.",
    },
    {
        "slug": "infrastruktura-2025",
        "title": "Инфраструктурное развитие области: планы на 2025",
        "excerpt": "Какие объекты планируются к строительству.",
        "content": "<p>Активное развитие региона.</p>",
        "meta_title": "Развитие инфраструктуры",
        "meta_description": "Планы развития.",
    },
    {
        "slug": "besplatnye-geodezicheskie-uslugi",
        "title": "Бесплатные геодезические услуги при покупке",
        "excerpt": "При покупке участка геодезисты бесплатно выполнят работы.",
        "content": "<p>Бесплатный вынос границ!</p>",
        "meta_title": "Бесплатные геодезические услуги",
        "meta_description": "Геодезия бесплатно.",
    },
]


# === Тестовые данные ===

REALTORS_DATA = [
    {"name": "Иванов Иван Иванович", "phone": "+7 (4012) 12-34-56", "email": "ivanov@test.ru", "company": "КалининградЗем"},
    {"name": "Петрова Мария Сергеевна", "phone": "+7 (4012) 65-43-21", "email": "petrova@test.ru", "company": "КалининградЗем"},
]

OWNERS_DATA = [
    {"name": "Сидоров Пётр", "phone": "+7 900 111-22-33", "notes": "Владелец участков у озера"},
    {"name": "Козлова Анна", "phone": "+7 900 444-55-66", "notes": "Участки в Светлогорске"},
    {"name": "ООО Землевладелец", "phone": "+7 4012 777-88-99", "notes": "Юридическое лицо"},
]


# === Районы и населённые пункты ===

DISTRICTS_DATA = [
    {
        "name": "Зеленоградский район",
        "slug": "zelenogradsk",
        "settlements": [
            {"name": "г. Зеленоградск", "slug": "zelenogradsk-city"},
            {"name": "пос. Озёрный", "slug": "ozerny"},
            {"name": "пос. Куково", "slug": "kukovo"},
        ],
    },
    {
        "name": "Светлогорский район",
        "slug": "svetlogorsk",
        "settlements": [
            {"name": "г. Светлогорск", "slug": "svetlogorsk-city"},
            {"name": "пос. Янтарный", "slug": "yantarny"},
        ],
    },
    {
        "name": "Гусевский район",
        "slug": "gusev",
        "settlements": [
            {"name": "г. Гусев", "slug": "gusev-city"},
        ],
    },
]


def seed_references(db: Session):
    """Наполнить справочники."""
    existing = db.query(Reference).count()
    if existing > 0:
        print(f"Справочники уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём справочники...")
    
    for i, data in enumerate(LAND_USE_DATA):
        ref = Reference(type="land_use", sort_order=i, **data)
        db.add(ref)
    
    for i, data in enumerate(LAND_CATEGORY_DATA):
        ref = Reference(type="land_category", sort_order=i, **data)
        db.add(ref)
    
    db.commit()
    print(f"Создано {len(LAND_USE_DATA) + len(LAND_CATEGORY_DATA)} записей справочников.")


def seed_news(db: Session):
    """Наполнить новости."""
    existing = db.query(News).count()
    if existing > 0:
        print(f"Новости уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём новости...")
    
    for i, data in enumerate(SAMPLE_NEWS):
        news = News(
            **data,
            is_published=True,
            published_at=datetime.utcnow() - timedelta(days=i * 2),
            views_count=100 - i * 10,
        )
        db.add(news)
    
    db.commit()
    print(f"Создано {len(SAMPLE_NEWS)} новостей.")


def seed_realtors(db: Session):
    """Создать риэлторов."""
    existing = db.query(Realtor).count()
    if existing > 0:
        print(f"Риэлторы уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём риэлторов...")
    for data in REALTORS_DATA:
        db.add(Realtor(**data))
    db.commit()
    print(f"Создано {len(REALTORS_DATA)} риэлторов.")


def seed_owners(db: Session):
    """Создать владельцев."""
    existing = db.query(Owner).count()
    if existing > 0:
        print(f"Владельцы уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём владельцев...")
    for data in OWNERS_DATA:
        db.add(Owner(**data))
    db.commit()
    print(f"Создано {len(OWNERS_DATA)} владельцев.")


def seed_locations(db: Session):
    """Создать районы и населённые пункты."""
    existing = db.query(District).count()
    if existing > 0:
        print(f"Районы уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём районы и населённые пункты...")
    
    for i, district_data in enumerate(DISTRICTS_DATA):
        district = District(
            name=district_data["name"],
            slug=district_data["slug"],
            sort_order=i,
        )
        db.add(district)
        db.flush()
        
        for j, settlement_data in enumerate(district_data["settlements"]):
            settlement = Settlement(
                district_id=district.id,
                name=settlement_data["name"],
                slug=settlement_data["slug"],
                sort_order=j,
            )
            db.add(settlement)
    
    db.commit()
    print(f"Создано {len(DISTRICTS_DATA)} районов.")


def seed_listings(db: Session):
    """Создать объявления с участками."""
    existing = db.query(Listing).count()
    if existing > 0:
        print(f"Объявления уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём объявления...")
    
    # Получаем справочники
    izhs = db.query(Reference).filter(Reference.code == "izhs").first()
    lph = db.query(Reference).filter(Reference.code == "lph").first()
    land_category = db.query(Reference).filter(Reference.code == "settlement").first()
    
    realtor = db.query(Realtor).first()
    owner = db.query(Owner).first()
    
    # Получаем населённые пункты
    ozerny = db.query(Settlement).filter(Settlement.slug == "ozerny").first()
    svetlogorsk_city = db.query(Settlement).filter(Settlement.slug == "svetlogorsk-city").first()
    gusev_city = db.query(Settlement).filter(Settlement.slug == "gusev-city").first()
    
    # Объявление 1: Один участок
    listing1 = Listing(
        slug="uchastok-u-ozera-zelenogradsk",
        title="Участок у озера в Зеленоградском районе",
        description="<p>Прекрасный участок с видом на озеро. Идеально для строительства загородного дома.</p>",
        realtor_id=realtor.id,
        settlement_id=ozerny.id if ozerny else None,
        is_published=True,
        is_featured=True,
        meta_title="Участок у озера — Зеленоградск",
        meta_description="Продажа участка у озера в Зеленоградском районе.",
    )
    db.add(listing1)
    db.flush()
    
    plot1 = Plot(
        listing_id=listing1.id,
        cadastral_number="39:05:010101:123",
        land_use_id=izhs.id if izhs else None,
        land_category_id=land_category.id if land_category else None,
        area=1500.0,  # 15 соток = 1500 м²
        address="Зеленоградский район, пос. Озёрный",
        price_public=1500000,
        price_per_sotka=100000,
        price_private=1200000,
        price_per_sotka_private=80000,
        status=PlotStatus.active,
        owner_id=owner.id if owner else None,
    )
    db.add(plot1)
    
    # Объявление 2: Массив из 3 участков
    listing2 = Listing(
        slug="massiv-uchastkov-svetlogorsk",
        title="Массив из 3 участков в Светлогорске",
        description="<p>Три смежных участка у моря. Можно приобрести вместе или по отдельности.</p>",
        realtor_id=realtor.id,
        settlement_id=svetlogorsk_city.id if svetlogorsk_city else None,
        is_published=True,
        is_featured=True,
        meta_title="3 участка в Светлогорске",
        meta_description="Массив участков у моря.",
    )
    db.add(listing2)
    db.flush()
    
    for i in range(3):
        plot = Plot(
            listing_id=listing2.id,
            cadastral_number=f"39:11:020202:{200 + i}",
            land_use_id=izhs.id if izhs else None,
            land_category_id=land_category.id if land_category else None,
            area=(10 + i * 2) * 100,  # сотки → м²
            address=f"Светлогорский район, участок №{i + 1}",
            price_public=1800000 + i * 200000,
            price_per_sotka=150000,
            status=PlotStatus.active if i < 2 else PlotStatus.sold,
        )
        db.add(plot)
    
    # Объявление 3: Фермерский участок
    listing3 = Listing(
        slug="fermerskij-uchastok-gusev",
        title="Фермерский участок в Гусевском районе",
        description="<p>Большой участок для ведения фермерского хозяйства.</p>",
        realtor_id=realtor.id,
        settlement_id=gusev_city.id if gusev_city else None,
        is_published=True,
        is_featured=True,
    )
    db.add(listing3)
    db.flush()
    
    plot3 = Plot(
        listing_id=listing3.id,
        land_use_id=lph.id if lph else None,
        area=5000.0,  # 50 соток = 5000 м²
        address="Гусевский район",
        price_public=2000000,
        price_per_sotka=40000,
        status=PlotStatus.active,
    )
    db.add(plot3)
    
    # Объявление 4: Проданный участок (не должен показываться)
    listing4 = Listing(
        slug="uchastok-prodan",
        title="Участок у реки (продан)",
        description="<p>Этот участок уже продан.</p>",
        realtor_id=realtor.id,
        is_published=True,
    )
    db.add(listing4)
    db.flush()
    
    plot4 = Plot(
        listing_id=listing4.id,
        area=12.0,
        price_public=1000000,
        status=PlotStatus.sold,
    )
    db.add(plot4)
    
    db.commit()
    print("Создано 4 объявления с участками.")


def seed_admin(db: Session):
    """Создать тестового администратора."""
    existing = db.query(AdminUser).count()
    if existing > 0:
        print(f"Админы уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём администратора...")
    admin = AdminUser(
        username="admin",
        password_hash=hash_password("admin123"),
        display_name="Администратор",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print("Создан админ: admin / admin123")


def main():
    """Главная функция."""
    print("Создаём таблицы...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_references(db)
        seed_news(db)
        seed_realtors(db)
        seed_owners(db)
        seed_locations(db)
        seed_listings(db)
        seed_admin(db)
    finally:
        db.close()
    
    print("\nГотово!")


if __name__ == "__main__":
    main()
