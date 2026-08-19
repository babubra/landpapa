"""
Отправка уведомлений в Telegram.

С российских серверов api.telegram.org обычно недоступен напрямую, поэтому запрос
при необходимости идёт через прокси. Прокси задаётся отдельными полями в настройках
админки (раздел «Уведомления и авторизация Telegram»): тип, хост, порт, логин, пароль.
Если хост не заполнен, запрос уходит напрямую.
"""

import logging
from urllib.parse import quote

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting

logger = logging.getLogger(__name__)

TELEGRAM_SETTING_KEYS = [
    "tg_bot_token",
    "tg_chat_id",
    "tg_proxy_type",
    "tg_proxy_host",
    "tg_proxy_port",
    "tg_proxy_user",
    "tg_proxy_password",
]

ALLOWED_PROXY_SCHEMES = ("http", "https", "socks5", "socks5h")

REQUEST_TIMEOUT = 15.0


async def load_telegram_settings(db: AsyncSession) -> dict[str, str]:
    """Прочитать настройки Telegram из БД."""
    result = await db.execute(
        select(Setting).where(Setting.key.in_(TELEGRAM_SETTING_KEYS))
    )
    return {s.key: (s.value or "").strip() for s in result.scalars().all()}


def build_proxy_url(settings: dict[str, str]) -> str | None:
    """
    Собрать адрес прокси из отдельных полей настроек.

    None означает «прокси не задан» — запрос уйдёт напрямую.
    """
    host = settings.get("tg_proxy_host", "").strip()
    if not host:
        return None

    scheme = (settings.get("tg_proxy_type") or "http").strip().lower()
    if scheme not in ALLOWED_PROXY_SCHEMES:
        scheme = "http"

    port = settings.get("tg_proxy_port", "").strip()

    # Хост могли вставить вместе со схемой — схему задаёт отдельное поле
    for prefix in ("http://", "https://", "socks5://", "socks5h://"):
        if host.lower().startswith(prefix):
            host = host[len(prefix):]
            break
    host = host.strip("/")

    # ...или вместе с портом
    if ":" in host and not port:
        host, _, port = host.partition(":")

    user = settings.get("tg_proxy_user", "").strip()
    password = settings.get("tg_proxy_password", "").strip()

    auth = ""
    if user and password:
        auth = f"{quote(user, safe='')}:{quote(password, safe='')}@"
    elif user:
        auth = f"{quote(user, safe='')}@"

    return f"{scheme}://{auth}{host}:{port}" if port else f"{scheme}://{auth}{host}"


def mask_proxy_url(proxy_url: str | None) -> str | None:
    """Адрес прокси без пароля — чтобы показывать в интерфейсе и писать в логи."""
    if not proxy_url:
        return None

    scheme, _, rest = proxy_url.partition("://")
    if "@" not in rest:
        return proxy_url

    credentials, _, host = rest.rpartition("@")
    user, sep, _password = credentials.partition(":")

    return f"{scheme}://{user}{':***' if sep else ''}@{host}"


def format_lead_message(lead_data: dict) -> str:
    """Текст уведомления о новой заявке."""
    return (
        f"🔔 *Новая заявка!*\n\n"
        f"👤 *Имя:* {lead_data.get('name') or 'не указано'}\n"
        f"📞 *Телефон:* `{lead_data.get('phone')}`\n"
        f"💬 *Коммент:* {lead_data.get('comment') or '-'}\n"
        f"🔗 *Источник:* {lead_data.get('source_url') or 'неизвестно'}"
    )


async def send_message(text: str, settings: dict[str, str]) -> tuple[bool, str | None]:
    """
    Отправить сообщение ботом.

    Возвращает (успех, текст ошибки). Исключения наружу не выпускает: отправка
    уведомления не должна ронять обработку заявки.
    """
    bot_token = settings.get("tg_bot_token", "")
    chat_id = settings.get("tg_chat_id", "")

    if not bot_token or not chat_id:
        logger.warning("Telegram: не заданы токен бота или chat_id, уведомление не отправлено")
        return False, "Не заданы токен бота или Chat ID"

    proxy_url = build_proxy_url(settings)
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}

    try:
        async with httpx.AsyncClient(proxy=proxy_url, timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload)
    except Exception as e:
        # Частые причины: api.telegram.org заблокирован и прокси не задан, либо прокси не отвечает
        logger.error(
            "Telegram: запрос не выполнен (прокси: %s): %s: %s",
            mask_proxy_url(proxy_url) or "без прокси",
            type(e).__name__,
            e,
        )
        return False, f"{type(e).__name__}: {e}"

    if response.status_code != 200:
        logger.error("Telegram: API вернул %s: %s", response.status_code, response.text)
        return False, f"HTTP {response.status_code}: {response.text[:300]}"

    logger.info(
        "Telegram: уведомление отправлено в чат %s (прокси: %s)",
        chat_id,
        mask_proxy_url(proxy_url) or "без прокси",
    )
    return True, None
