"""
API для работы с заявками (лидами).
Асинхронная версия.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.database import get_async_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadAdmin, LeadListResponse, LeadUpdate
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.services.telegram import format_lead_message, load_telegram_settings, send_message

logger = logging.getLogger(__name__)

router = APIRouter()

# Меньше этого времени форму заполняет только робот
MIN_FORM_TIME_MS = 1500

# Ссылки на фоновые отправки уведомлений: без них сборщик мусора может уничтожить
# задачу до завершения запроса (asyncio держит на задачи только слабые ссылки)
_notification_tasks: set[asyncio.Task] = set()


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
    # 1. Отсев ботов: скрытый чекбокс и мгновенная отправка.
    # Ответ в обоих случаях как при успехе, чтобы бот не понял, что его отсеяли.
    # Отсутствие form_time_ms не считаем поводом отбросить заявку: так отправляют
    # старые открытые вкладки, и терять живого человека из-за этого нельзя.
    spam_reason = None
    if data.subscribe_updates:
        spam_reason = "заполнена скрытая ловушка"
    elif data.form_time_ms is not None and data.form_time_ms < MIN_FORM_TIME_MS:
        spam_reason = f"форма заполнена за {data.form_time_ms} мс"

    if spam_reason:
        # Пишем в лог: если сюда попадёт живой человек, это будет видно, а не потеряется молча
        logger.warning(
            "Заявка отброшена как спам (%s). IP: %s, User-Agent: %s",
            spam_reason,
            request.client.host if request.client else "неизвестен",
            request.headers.get("user-agent", "неизвестен"),
        )
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

    # 4. Уведомление в Telegram (асинхронно, ошибки только логируются)
    tg_settings = await load_telegram_settings(db)

    if tg_settings.get("tg_bot_token") and tg_settings.get("tg_chat_id"):
        lead_dict = {
            "name": new_lead.name,
            "phone": new_lead.phone,
            "comment": new_lead.comment,
            "source_url": new_lead.source_url
        }
        task = asyncio.create_task(send_message(format_lead_message(lead_dict), tg_settings))
        _notification_tasks.add(task)
        task.add_done_callback(_notification_tasks.discard)

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
