"""
Админский API для управления риэлторами.
Асинхронная версия.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_async_db
from app.models.realtor import Realtor
from app.models.admin_user import AdminUser
from app.models.listing import Listing
from app.routers.auth import get_current_user


router = APIRouter()


# === Pydantic схемы ===

class RealtorResponse(BaseModel):
    """Риэлтор (полная информация)."""
    id: int
    name: str
    phone: str
    email: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RealtorCreate(BaseModel):
    """Создание риэлтора."""
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    email: str | None = Field(None, max_length=255)
    is_active: bool = True


class RealtorUpdate(BaseModel):
    """Обновление риэлтора."""
    name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, min_length=1, max_length=50)
    email: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class RealtorsResponse(BaseModel):
    """Ответ со списком риэлторов."""
    items: list[RealtorResponse]
    total: int


# === Endpoints ===

@router.get("/", response_model=RealtorsResponse)
async def get_realtors(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список всех риэлторов."""
    result = await db.execute(
        select(Realtor).order_by(Realtor.name)
    )
    realtors = result.scalars().all()
    return RealtorsResponse(items=realtors, total=len(realtors))


@router.get("/{realtor_id}", response_model=RealtorResponse)
async def get_realtor(
    realtor_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить риэлтора по ID."""
    result = await db.execute(
        select(Realtor).where(Realtor.id == realtor_id)
    )
    realtor = result.scalar_one_or_none()
    
    if not realtor:
        raise HTTPException(status_code=404, detail="Риэлтор не найден")
    return realtor


@router.post("/", response_model=RealtorResponse, status_code=status.HTTP_201_CREATED)
async def create_realtor(
    data: RealtorCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать нового риэлтора."""
    realtor = Realtor(**data.model_dump())
    db.add(realtor)
    await db.commit()
    await db.refresh(realtor)
    return realtor


@router.put("/{realtor_id}", response_model=RealtorResponse)
async def update_realtor(
    realtor_id: int,
    data: RealtorUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить риэлтора."""
    result = await db.execute(
        select(Realtor).where(Realtor.id == realtor_id)
    )
    realtor = result.scalar_one_or_none()
    
    if not realtor:
        raise HTTPException(status_code=404, detail="Риэлтор не найден")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(realtor, key, value)
    
    await db.commit()
    await db.refresh(realtor)
    return realtor


@router.delete("/{realtor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_realtor(
    realtor_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить риэлтора."""
    result = await db.execute(
        select(Realtor).where(Realtor.id == realtor_id)
    )
    realtor = result.scalar_one_or_none()
    
    if not realtor:
        raise HTTPException(status_code=404, detail="Риэлтор не найден")
    
    # Проверяем, есть ли объявления с этим риэлтором
    count_result = await db.execute(
        select(func.count(Listing.id)).where(Listing.realtor_id == realtor_id)
    )
    listings_count = count_result.scalar() or 0
    
    if listings_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Нельзя удалить: есть {listings_count} объявлений с этим риэлтором"
        )
    
    await db.delete(realtor)
    await db.commit()
    return None
