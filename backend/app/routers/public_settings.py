"""
Публичный API для получения настроек сайта.
Без авторизации — для использования на публичном фронтенде.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
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


@router.get("/public", response_model=PublicSettingsResponse)
async def get_public_settings(db: Session = Depends(get_db)):
    """
    Получить публичные настройки сайта.
    Эндпоинт не требует авторизации.
    """
    settings = db.query(Setting).filter(Setting.key.in_(PUBLIC_SETTING_KEYS)).all()
    
    result = {}
    for setting in settings:
        result[setting.key] = setting.value if setting.value else None
    
    return PublicSettingsResponse(**result)
