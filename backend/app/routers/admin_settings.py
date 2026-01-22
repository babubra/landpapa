"""
Админский API для управления настройками системы.
Асинхронная версия.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.models.setting import Setting
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user


router = APIRouter()


# === Pydantic схемы ===

class SettingItem(BaseModel):
    """Настройка."""
    key: str
    value: str | None
    description: str | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    """Обновление настройки."""
    value: str | None


class SettingsResponse(BaseModel):
    """Ответ со всеми настройками."""
    items: list[SettingItem]


# === Endpoints ===

@router.get("/", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить все настройки."""
    result = await db.execute(
        select(Setting).order_by(Setting.key)
    )
    settings = result.scalars().all()
    return SettingsResponse(items=settings)


@router.get("/{key}", response_model=SettingItem)
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить конкретную настройку."""
    result = await db.execute(
        select(Setting).where(Setting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Настройка не найдена")
    return setting


@router.put("/{key}", response_model=SettingItem)
async def update_setting(
    key: str,
    data: SettingUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить настройку."""
    result = await db.execute(
        select(Setting).where(Setting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        # Если настройки нет - создаём новую (Upsert)
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
        setting.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(setting)
    
    
    # Cache invalidation for NSPD is not needed because it's instantiated per-request
    # checking DB settings every time.
    # if key.startswith("nspd_"):
    #     _invalidate_nspd_client()

    
    # Сбрасываем кеш DaData клиента при изменении его настроек
    if key.startswith("dadata_"):
        try:
             _invalidate_dadata_client()
        except ImportError:
             pass # Fail silently if not implemented

    
    return setting



class CheckProxyRequest(BaseModel):
    """Запрос на проверку прокси."""
    proxy: str
    test_url: str | None = "https://api.ipify.org?format=json"

class CheckProxyResponse(BaseModel):
    """Результат проверки прокси."""
    success: bool
    status_code: int | None
    ip: str | None
    error: str | None
    elapsed_ms: float

@router.post("/check-proxy", response_model=CheckProxyResponse)
async def check_proxy(
    data: CheckProxyRequest,
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Проверка соединения через прокси.
    """
    import httpx
    import time
    
    start_time = time.time()
    
    try:
        proxy_url = None
        if data.proxy and data.proxy.strip():
            proxy_url = data.proxy.strip()
            # Добавляем схему, если её нет (httpx требует схему)
            if not proxy_url.startswith("http://") and not proxy_url.startswith("https://"):
                 proxy_url = f"http://{proxy_url}"
        
        async with httpx.AsyncClient(proxy=proxy_url, timeout=10.0, verify=False) as client:
            response = await client.get(data.test_url or "https://api.ipify.org?format=json")
            
            elapsed_ms = (time.time() - start_time) * 1000
            
            result_ip = None
            try:
                json_resp = response.json()
                if isinstance(json_resp, dict):
                    result_ip = json_resp.get("ip") or json_resp.get("origin")
            except Exception:
                pass
            
            return CheckProxyResponse(
                success=response.status_code == 200,
                status_code=response.status_code,
                ip=result_ip,
                error=None,
                elapsed_ms=elapsed_ms
            )
            
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        return CheckProxyResponse(
            success=False,
            status_code=None,
            ip=None,
            error=str(e),
            elapsed_ms=elapsed_ms
        )


# def _invalidate_nspd_client():
#     """Сброс NSPD клиента для применения новых настроек."""
#     # Not used anymore
#     pass


def _invalidate_dadata_client():
    """Сброс DaData клиента для применения новых настроек."""
    from app.dadata_client import reset_dadata_client
    reset_dadata_client()
