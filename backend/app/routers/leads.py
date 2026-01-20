"""
API для работы с заявками (лидами).
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import asyncio

from app.database import get_async_db
from app.models.lead import Lead
from app.models.setting import Setting
from app.schemas.lead import LeadCreate, LeadAdmin, LeadListResponse, LeadUpdate
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


async def send_telegram_notification(lead_data: dict, bot_token: str, chat_id: str):
    """
    Отправка уведомления в Telegram через Bot API.
    """
    message = (
        f"🔔 *Новая заявка!*\n\n"
        f"👤 *Имя:* {lead_data.get('name') or 'не указано'}\n"
        f"📞 *Телефон:* `{lead_data.get('phone')}`\n"
        f"💬 *Коммент:* {lead_data.get('comment') or '-'}\n"
        f"🔗 *Источник:* {lead_data.get('source_url') or 'неизвестно'}"
    )
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code != 200:
                print(f"Telegram API Error ({response.status_code}): {response.text}")
            else:
                print(f"Telegram notification sent successfully to chat {chat_id}")
            response.raise_for_status()
        except Exception as e:
            print(f"Error sending TG notification: {e}")


@router.post("/public", status_code=201)
async def create_public_lead(
    request: Request,
    data: LeadCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Создание заявки с публичной части сайта.
    Включена защита Honeypot.
    """
    # 1. Проверка Honeypot
    if data.email_confirm or data.last_name:
        # Это бот. Возвращаем 201, чтобы он думал, что всё успешно, но ничего не сохраняем.
        return {"status": "success", "message": "Lead received (bot)"}

    # 2. Очистка телефона (убираем лишние символы)
    clean_phone = "".join(filter(str.isdigit, data.phone))
    if len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Неверный формат телефона")

    # 3. Сохранение в БД
    new_lead = Lead(
        name=data.name,
        phone=data.phone,
        comment=data.comment,
        source_url=str(request.headers.get("referer", "")),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status="new"
    )
    
    db.add(new_lead)
    await db.commit()
    await db.refresh(new_lead)

    # 4. Уведомление в Telegram (асинхронно)
    result = await db.execute(
        select(Setting).where(Setting.key.in_(["tg_bot_token", "tg_chat_id"]))
    )
    settings_list = result.scalars().all()
    settings_dict = {s.key: s.value for s in settings_list}
    
    bot_token = settings_dict.get("tg_bot_token")
    chat_id = settings_dict.get("tg_chat_id")
    
    if bot_token and chat_id:
        lead_dict = {
            "name": new_lead.name,
            "phone": new_lead.phone,
            "comment": new_lead.comment,
            "source_url": new_lead.source_url
        }
        asyncio.create_task(send_telegram_notification(
            lead_dict, 
            bot_token, 
            chat_id
        ))

    return {"status": "success", "id": new_lead.id}


@router.get("/admin", response_model=LeadListResponse)
async def get_admin_leads(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Получение списка заявок для админки."""
    # Базовый запрос
    query = select(Lead)
    count_query = select(func.count(Lead.id))
    
    if status:
        query = query.where(Lead.status == status)
        count_query = count_query.where(Lead.status == status)
    
    # Подсчёт
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Получение данных
    query = query.order_by(desc(Lead.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }


@router.patch("/admin/{lead_id}", response_model=LeadAdmin)
async def update_lead_status(
    lead_id: int,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Обновление статуса заявки."""
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
        
    lead.status = data.status
    await db.commit()
    await db.refresh(lead)
    
    return lead
