"""
Скрипт для наполнения базы данных базовыми данными.

Запуск:
    python -m app.seed
"""

from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
# Импортируем все модели, чтобы Base.metadata знал о них при создании таблиц
import app.models  # noqa
from app.models.reference import Reference
from app.models.admin_user import AdminUser
from app.models.setting import Setting
from app.models.location import Location, LocationType
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


# === Данные локаций Калининградской области ===
# Структура: Region -> Districts/Cities -> Settlements

LOCATIONS_DATA = {
    "region": {
        "name": "Калининградская область",
        "slug": "kaliningradskaja-oblast",
    },
    # Городские округа (города, которые сами являются муниципальными образованиями)
    "urban_okrugs": [
        {"name": "Калининград", "slug": "kaliningrad", "settlement_type": "г", "sort_order": 0},
        {"name": "Пионерский", "slug": "pionerskij", "settlement_type": "г", "sort_order": 1},
        {"name": "Светлогорск", "slug": "svetlogorsk", "settlement_type": "г", "sort_order": 2},
        {"name": "Янтарный", "slug": "yantarnyj", "settlement_type": "пгт", "sort_order": 3},
    ],
    # Муниципальные районы
    "districts": [
        {"name": "Багратионовский район", "slug": "bagrationovskij-r-n", "sort_order": 10},
        {"name": "Балтийский район", "slug": "baltijskij-r-n", "sort_order": 11},
        {"name": "Гвардейский район", "slug": "gvardejskij-r-n", "sort_order": 12},
        {"name": "Гурьевский район", "slug": "gurjevskij-r-n", "sort_order": 13},
        {"name": "Гусевский район", "slug": "gusevskij-r-n", "sort_order": 14},
        {"name": "Зеленоградский район", "slug": "zelenogradskij-r-n", "sort_order": 15},
        {"name": "Краснознаменский район", "slug": "krasnoznamenskij-r-n", "sort_order": 16},
        {"name": "Мамоновский район", "slug": "mamonovskij-r-n", "sort_order": 17},
        {"name": "Неманский район", "slug": "nemanskij-r-n", "sort_order": 18},
        {"name": "Нестеровский район", "slug": "nesterovskij-r-n", "sort_order": 19},
        {"name": "Озёрский район", "slug": "ozerskij-r-n", "sort_order": 20},
        {"name": "Полесский район", "slug": "polesskij-r-n", "sort_order": 21},
        {"name": "Правдинский район", "slug": "pravdinskij-r-n", "sort_order": 22},
        {"name": "Светловский район", "slug": "svetlovskij-r-n", "sort_order": 23},
        {"name": "Славский район", "slug": "slavskij-r-n", "sort_order": 24},
        {"name": "Советский район", "slug": "sovetskij-r-n", "sort_order": 25},
        {"name": "Черняховский район", "slug": "chernjahovskij-r-n", "sort_order": 26},
    ],
}


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


def seed_locations(db: Session):
    """Создать начальную иерархию локаций Калининградской области."""
    existing = db.query(Location).count()
    if existing > 0:
        print(f"Локации уже есть ({existing}). Пропускаем.")
        return
    
    print("Создаём иерархию локаций...")
    
    # 1. Создаём регион
    region_data = LOCATIONS_DATA["region"]
    region = Location(
        name=region_data["name"],
        slug=region_data["slug"],
        type=LocationType.REGION,
        parent_id=None,
        sort_order=0,
    )
    db.add(region)
    db.flush()  # Получаем ID региона
    
    # 2. Создаём городские округа (parent = region)
    for data in LOCATIONS_DATA["urban_okrugs"]:
        city = Location(
            name=data["name"],
            slug=data["slug"],
            type=LocationType.CITY,
            settlement_type=data.get("settlement_type"),
            parent_id=region.id,
            sort_order=data.get("sort_order", 0),
        )
        db.add(city)
    
    # 3. Создаём муниципальные районы (parent = region)
    for data in LOCATIONS_DATA["districts"]:
        district = Location(
            name=data["name"],
            slug=data["slug"],
            type=LocationType.DISTRICT,
            parent_id=region.id,
            sort_order=data.get("sort_order", 0),
        )
        db.add(district)
    
    db.commit()
    
    total_cities = len(LOCATIONS_DATA["urban_okrugs"])
    total_districts = len(LOCATIONS_DATA["districts"])
    print(f"Создано: 1 регион, {total_cities} городских округов, {total_districts} районов.")


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
            "value": "РКК Лэнд — Земельные участки в Калининградской области",
            "description": "Заголовок страницы (Meta Title) для браузера"
        },
        {
            "key": "site_name",
            "value": "РКК Лэнд",
            "description": "Название бренда (отображается рядом с логотипом)"
        },
        {
            "key": "site_subtitle",
            "value": "Земельные участки",
            "description": "Подзаголовок сайта"
        },
        {
            "key": "site_phone",
            "value": "+7 (4012) 12-34-56",
            "description": "Телефон в шапке и футере сайта"
        },
        {
            "key": "site_email",
            "value": "info@kaliningrad-zem.ru",
            "description": "Email в футере сайта"
        },
        {
            "key": "site_address",
            "value": "г. Калининград, ул. Примерная, д. 1",
            "description": "Адрес в футере сайта"
        },
        {
            "key": "site_work_hours_weekdays",
            "value": "Пн–Пт: 9:00 – 18:00",
            "description": "Режим работы в будни"
        },
        {
            "key": "site_work_hours_weekend",
            "value": "Сб: 10:00 – 16:00, Вс: выходной",
            "description": "Режим работы в выходные"
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
        # Уведомления Telegram
        {
            "key": "tg_bot_token",
            "value": "",
            "description": "Токен Telegram бота (от @BotFather)"
        },
        {
            "key": "tg_chat_id",
            "value": "",
            "description": "ID чата или группы для уведомлений"
        },
        {
            "key": "privacy_policy",
            "value": "<h2>1. Общие положения</h2><p>Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. №152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые Администрацией сайта.</p><h2>2. Основные понятия, используемые в Политике</h2><p>Персональные данные — любая информация, относящаяся прямо или косвенно к определенному или определяемому физическому лицу (субъекту персональных данных).<br>Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными.</p><h2>3. Какие данные мы собираем</h2><p>Мы собираем следующие персональные данные, которые вы добровольно предоставляете через формы обратной связи на сайте:</p><ul><li>Имя;</li><li>Номер контактного телефона.</li></ul><h2>4. Цели обработки персональных данных</h2><p>Цель обработки персональных данных Пользователя — информирование Пользователя посредством телефонных звонков; предоставление консультаций по вопросам приобретения земельных участков; уточнение деталей заявки.</p><h2>5. Правовые основания обработки</h2><p>Администрация обрабатывает персональные данные Пользователя только в случае их заполнения и/или отправки Пользователем самостоятельно через специальные формы, расположенные на сайте. Отправляя свои персональные данные, Пользователь выражает свое согласие с данной Политикой.</p><h2>6. Порядок сбора, хранения, передачи и других видов обработки</h2><p>Безопасность персональных данных, которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных.</p><p>Передача данных третьим лицам не осуществляется, за исключением случаев, предусмотренных законодательством РФ.</p><h2>7. Заключительные положения</h2><p>Пользователь может получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных данных, обратившись к Администрации через контакты, указанные на сайте.<br>Данный документ будет отражать любые изменения политики обработки персональных данных Оператором. Политика действует бессрочно до замены ее новой версией.</p>",
            "description": "Текст политики конфиденциальности (HTML)"
        },
        # Страница "О нас"
        {
            "key": "about_page",
            "value": "",
            "description": "Контент страницы «О нас» (HTML)"
        },
        # Страница "Контакты"
        {
            "key": "contacts_page",
            "value": "",
            "description": "Описание и дополнительная информация на странице контактов (HTML)"
        },
        {
            "key": "contacts_map_iframe",
            "value": '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A3b2e50185e134c71df3b8434922b7f9d9a3b537c084a4b0df8f6c51701efd9ed&amp;source=constructor" width="100%" height="400" frameborder="0"></iframe>',
            "description": "Код iframe для Яндекс.Карт на странице контактов"
        },
        # SEO-текст на главной
        {
            "key": "seo_homepage_text",
            "value": "",
            "description": "SEO-текст на главной странице (HTML, рекомендуется 300-400 слов)"
        },
        # Метаданные страниц
        {
            "key": "seo_catalog_title",
            "value": "",
            "description": "Title страницы «Каталог»"
        },
        {
            "key": "seo_catalog_description",
            "value": "",
            "description": "Description страницы «Каталог»"
        },
        {
            "key": "seo_about_title",
            "value": "",
            "description": "Title страницы «О нас»"
        },
        {
            "key": "seo_about_description",
            "value": "",
            "description": "Description страницы «О нас»"
        },
        {
            "key": "seo_contacts_title",
            "value": "",
            "description": "Title страницы «Контакты»"
        },
        {
            "key": "seo_contacts_description",
            "value": "",
            "description": "Description страницы «Контакты»"
        },
        {
            "key": "seo_news_title",
            "value": "",
            "description": "Title страницы «Новости»"
        },
        {
            "key": "seo_news_description",
            "value": "",
            "description": "Description страницы «Новости»"
        },
        {
            "key": "seo_map_title",
            "value": "",
            "description": "Title страницы «Карта»"
        },
        {
            "key": "seo_map_description",
            "value": "",
            "description": "Description страницы «Карта»"
        },
        # Ссылки на соцсети
        {
            "key": "org_vk_url",
            "value": "",
            "description": "Ссылка на группу VK"
        },
        {
            "key": "org_telegram_url",
            "value": "",
            "description": "Ссылка на Telegram"
        },
        {
            "key": "org_max_url",
            "value": "",
            "description": "Ссылка на мессенджер Max"
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
        seed_locations(db)
        seed_settings(db)
    finally:
        db.close()
    
    print("\nГотово!")


if __name__ == "__main__":
    main()
