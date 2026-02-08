"""
API роутер для аутентификации.
Асинхронная версия.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.admin_user import AdminUser
from app.models.setting import Setting
from app.auth import verify_password, hash_password, create_access_token, decode_access_token
from app.utils.email import send_email
from app.config import settings


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# === Схемы ===

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    is_active: bool

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# === Зависимости ===

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> AdminUser:
    """Получить текущего пользователя из JWT токена."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == username)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    return user


# === Эндпоинты ===

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    """Авторизация и получение JWT токена."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    # Обновляем время последнего входа
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Создаём токен
    access_token = create_access_token(data={"sub": user.username})
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: AdminUser = Depends(get_current_user)):
    """Получить информацию о текущем пользователе."""
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, 
    db: AsyncSession = Depends(get_async_db)
):
    """Запрос на восстановление пароля."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Не выдаем, что email не найден в целях безопасности
        return {"detail": "Если этот email зарегистрирован, вы получите письмо."}

    # Создаем токен на 15 минут
    reset_token = create_access_token(
        data={"sub": user.username, "type": "password_reset"}, 
        expires_delta=timedelta(minutes=15)
    )

    # Формируем ссылку
    site_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
    reset_link = f"{site_url}/reset-password?token={reset_token}"

    # Отправляем письмо
    try:
        subject = "Восстановление пароля — РКК Лэнд"
        text = f"Здравствуйте! Чтобы сбросить пароль, перейдите по ссылке: {reset_link}\nСсылка действует 15 минут."
        html = f"""
        <p>Здравствуйте!</p>
        <p>Чтобы сбросить пароль для доступа к админ-панели <b>РКК Лэнд</b>, нажмите на кнопку ниже:</p>
        <p><a href="{reset_link}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Сбросить пароль</a></p>
        <p>Или скопируйте ссылку в браузер: {reset_link}</p>
        <p><i>Ссылка действует 15 минут.</i></p>
        """
        send_email(subject, [user.email], text, html)
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при отправке письма")

    return {"detail": "Письмо отправлено."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest, 
    db: AsyncSession = Depends(get_async_db)
):
    """Смена пароля по токену."""
    payload = decode_access_token(request.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Неверный или просроченный токен")

    username = payload.get("sub")
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Меняем пароль
    user.password_hash = hash_password(request.new_password)
    await db.commit()

    return {"detail": "Пароль успешно изменен."}


# === Telegram авторизация ===

class TelegramAuthData(BaseModel):
    """Данные от Telegram Login Widget."""
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    """Проверка подписи данных от Telegram Login Widget."""
    import hashlib
    import hmac
    
    check_hash = data.pop("hash", None)
    if not check_hash:
        return False
    
    # Сортируем и формируем строку для проверки
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items()) if v is not None
    )
    
    # Создаём секретный ключ из токена бота
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Вычисляем HMAC
    calculated_hash = hmac.new(
        secret_key, 
        data_check_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_hash, check_hash)


@router.post("/telegram", response_model=Token)
async def telegram_login(
    data: TelegramAuthData,
    db: AsyncSession = Depends(get_async_db),
):
    """Авторизация через Telegram Login Widget."""
    import time
    
    # Получаем токен бота из БД (настройки сайта)
    result = await db.execute(
        select(Setting).where(Setting.key == "telegram_bot_token")
    )
    setting = result.scalar_one_or_none()
    bot_token = setting.value if setting else None
    
    if not bot_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram авторизация не настроена (укажите токен бота в настройках)",
        )
    
    # Проверяем, что данные не устарели (не старше 1 дня)
    if time.time() - data.auth_date > 86400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Данные авторизации устарели",
        )
    
    # Проверяем подпись
    auth_data = data.model_dump()
    if not verify_telegram_auth(auth_data.copy(), bot_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверная подпись данных Telegram",
        )
    
    # Ищем пользователя по telegram_id
    result = await db.execute(
        select(AdminUser).where(AdminUser.telegram_id == data.id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к админ-панели",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    # Обновляем время последнего входа
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Создаём токен
    access_token = create_access_token(data={"sub": user.username})
    
    return Token(access_token=access_token)


@router.post("/telegram-dev", response_model=Token)
async def telegram_dev_login(
    telegram_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """Dev-режим: авторизация по telegram_id напрямую (только при DEBUG=true)."""
    if not settings.debug:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login отключён в production",
        )
    
    # Ищем пользователя по telegram_id
    result = await db.execute(
        select(AdminUser).where(AdminUser.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь с таким telegram_id не найден",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    # Обновляем время последнего входа
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Создаём токен
    access_token = create_access_token(data={"sub": user.username})
    
    return Token(access_token=access_token)

