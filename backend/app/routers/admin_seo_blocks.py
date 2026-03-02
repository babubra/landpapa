"""
Админский API для CRUD SEO-блоков.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.seo_block import SeoBlock
from app.models.location import Location
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.schemas.seo_block import (
    SeoBlockAdmin,
    SeoBlockCreate,
    SeoBlockUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[SeoBlockAdmin])
async def get_seo_blocks(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Список всех SEO-блоков (включая неактивные)."""
    result = await db.execute(
        select(SeoBlock)
        .options(selectinload(SeoBlock.location))
        .order_by(SeoBlock.sort_order)
    )
    return result.scalars().all()


@router.get("/{block_id}", response_model=SeoBlockAdmin)
async def get_seo_block(
    block_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить SEO-блок по ID."""
    result = await db.execute(
        select(SeoBlock)
        .options(selectinload(SeoBlock.location))
        .where(SeoBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="SEO-блок не найден")
    return block


@router.post("/", response_model=SeoBlockAdmin, status_code=status.HTTP_201_CREATED)
async def create_seo_block(
    data: SeoBlockCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать SEO-блок."""
    # Проверяем локацию если задана
    if data.location_id:
        result = await db.execute(
            select(Location).where(Location.id == data.location_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Локация не найдена")

    block = SeoBlock(**data.model_dump())
    db.add(block)
    await db.commit()
    await db.refresh(block)

    # Загружаем связанную локацию для ответа
    result = await db.execute(
        select(SeoBlock)
        .options(selectinload(SeoBlock.location))
        .where(SeoBlock.id == block.id)
    )
    return result.scalar_one()


@router.put("/{block_id}", response_model=SeoBlockAdmin)
async def update_seo_block(
    block_id: int,
    data: SeoBlockUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить SEO-блок."""
    result = await db.execute(
        select(SeoBlock).where(SeoBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="SEO-блок не найден")

    # Проверяем локацию если обновляется
    if data.location_id is not None and data.location_id:
        result = await db.execute(
            select(Location).where(Location.id == data.location_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Локация не найдена")

    # Обновляем только переданные поля
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(block, key, value)

    await db.commit()
    await db.refresh(block)

    # Подгружаем связи
    result = await db.execute(
        select(SeoBlock)
        .options(selectinload(SeoBlock.location))
        .where(SeoBlock.id == block.id)
    )
    return result.scalar_one()


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seo_block(
    block_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить SEO-блок."""
    result = await db.execute(
        select(SeoBlock).where(SeoBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="SEO-блок не найден")

    await db.delete(block)
    await db.commit()
    return None
