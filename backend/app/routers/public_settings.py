"""
Публичный API для получения настроек сайта.
Без авторизации — для использования на публичном фронтенде.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.models.setting import Setting

router = APIRouter()

# Ключи, доступные публично
PUBLIC_SETTING_KEYS = [
    "site_title",
    "site_name",
    "site_subtitle", 
    "site_phone",
    "site_email",
    "site_address",
    "site_work_hours_weekdays",
    "site_work_hours_weekend",
    "site_logo",
    "hero_title",
    "hero_subtitle",
    "hero_image",
    "placeholder_image",
    "privacy_policy",
    "about_page",
    "contacts_page",
    "contacts_map_iframe",
    # SEO
    "site_description",
    "site_keywords",
    "og_image",
    # SEO-текст на главной
    "seo_homepage_text",
    # Метаданные страниц
    "seo_catalog_title",
    "seo_catalog_description",
    "seo_about_title",
    "seo_about_description",
    "seo_contacts_title",
    "seo_contacts_description",
    "seo_news_title",
    "seo_news_description",
    "seo_map_title",
    "seo_map_description",
    # Шаблоны для Geo-страниц
    "seo_geo_title_template",
    "seo_geo_description_template",
    "seo_geo_h1_template",
    # Шаблоны для страниц объявлений
    "seo_listing_title_template",
    "seo_listing_description_template",
    # Соцсети
    "org_vk_url",
    "org_telegram_url",
    "org_max_url",
]


class PublicSettingsResponse(BaseModel):
    """Публичные настройки сайта."""
    site_title: str | None = None
    site_name: str | None = None
    site_subtitle: str | None = None
    site_phone: str | None = None
    site_email: str | None = None
    site_address: str | None = None
    site_work_hours_weekdays: str | None = None
    site_work_hours_weekend: str | None = None
    site_logo: str | None = None
    hero_title: str | None = None
    hero_subtitle: str | None = None
    hero_image: str | None = None
    placeholder_image: str | None = None
    privacy_policy: str | None = None
    about_page: str | None = None
    contacts_page: str | None = None
    contacts_map_iframe: str | None = None
    # SEO
    site_description: str | None = None
    site_keywords: str | None = None
    og_image: str | None = None
    # SEO-текст на главной
    seo_homepage_text: str | None = None
    # Метаданные страниц
    seo_catalog_title: str | None = None
    seo_catalog_description: str | None = None
    seo_about_title: str | None = None
    seo_about_description: str | None = None
    seo_contacts_title: str | None = None
    seo_contacts_description: str | None = None
    seo_news_title: str | None = None
    seo_news_description: str | None = None
    seo_map_title: str | None = None
    seo_map_description: str | None = None
    # Шаблоны для Geo-страниц
    seo_geo_title_template: str | None = None
    seo_geo_description_template: str | None = None
    seo_geo_h1_template: str | None = None
    # Шаблоны для страниц объявлений
    seo_listing_title_template: str | None = None
    seo_listing_description_template: str | None = None
    # Соцсети
    org_vk_url: str | None = None
    org_telegram_url: str | None = None
    org_max_url: str | None = None


@router.get("/public", response_model=PublicSettingsResponse)
async def get_public_settings(db: AsyncSession = Depends(get_async_db)):
    """
    Получить публичные настройки сайта.
    Эндпоинт не требует авторизации.
    """
    result = await db.execute(
        select(Setting).where(Setting.key.in_(PUBLIC_SETTING_KEYS))
    )
    settings_list = result.scalars().all()
    
    result_dict = {}
    for setting in settings_list:
        result_dict[setting.key] = setting.value if setting.value else None
    
    return PublicSettingsResponse(**result_dict)
