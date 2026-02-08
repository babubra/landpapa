"""
API роутер для управления пользователями админ-панели.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.admin_user import AdminUser
from app.auth import hash_password
from app.routers.auth import get_current_user


router = APIRouter()


# === Схемы ===

class AdminUserResponse(BaseModel):
    """Ответ с данными пользователя."""
    id: int
    username: str
    email: str | None
    display_name: str | None
    telegram_id: int | None
    is_active: bool
    created_at: datetime
    last_login: datetime | None

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    """Создание пользователя."""
    username: str
    password: str
    email: str | None = None
    display_name: str | None = None
    telegram_id: int | None = None
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    """Обновление пользователя."""
    username: str | None = None
    email: str | None = None
    display_name: str | None = None
    telegram_id: int | None = None
    is_active: bool | None = None


class PasswordChange(BaseModel):
    """Смена пароля."""
    new_password: str


class AdminUsersListResponse(BaseModel):
    """Список пользователей."""
    items: list[AdminUserResponse]
    total: int


# === Эндпоинты ===

@router.get("/", response_model=AdminUsersListResponse)
async def list_users(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список всех пользователей."""
    result = await db.execute(
        select(AdminUser).order_by(AdminUser.id)
    )
    users = result.scalars().all()
    
    return AdminUsersListResponse(
        items=users,
        total=len(users)
    )


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить пользователя по ID."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return user


@router.post("/", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать нового пользователя."""
    # Проверяем уникальность username
    existing = await db.execute(
        select(AdminUser).where(AdminUser.username == data.username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует"
        )
    
    # Проверяем уникальность telegram_id
    if data.telegram_id:
        existing_tg = await db.execute(
            select(AdminUser).where(AdminUser.telegram_id == data.telegram_id)
        )
        if existing_tg.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким Telegram ID уже существует"
            )
    
    # Создаём пользователя
    user = AdminUser(
        username=data.username,
        password_hash=hash_password(data.password),
        email=data.email,
        display_name=data.display_name,
        telegram_id=data.telegram_id,
        is_active=data.is_active,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.put("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить данные пользователя."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Проверяем уникальность username
    if data.username and data.username != user.username:
        existing = await db.execute(
            select(AdminUser).where(AdminUser.username == data.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким username уже существует"
            )
        user.username = data.username
    
    # Проверяем уникальность telegram_id
    if data.telegram_id is not None and data.telegram_id != user.telegram_id:
        if data.telegram_id:  # Не проверяем если устанавливается в None
            existing_tg = await db.execute(
                select(AdminUser).where(AdminUser.telegram_id == data.telegram_id)
            )
            if existing_tg.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким Telegram ID уже существует"
                )
        user.telegram_id = data.telegram_id
    
    # Обновляем остальные поля
    if data.email is not None:
        user.email = data.email
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.is_active is not None:
        user.is_active = data.is_active
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.patch("/{user_id}/password")
async def change_user_password(
    user_id: int,
    data: PasswordChange,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Сменить пароль пользователю."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    
    return {"detail": "Пароль успешно изменён"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить пользователя."""
    # Нельзя удалить самого себя
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить самого себя"
        )
    
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"detail": "Пользователь удалён"}
