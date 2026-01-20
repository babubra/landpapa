"""
Публичный API для справочников.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.models.reference import Reference

router = APIRouter()


class ReferenceItem(BaseModel):
    """Элемент справочника."""
    id: int
    code: str
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ReferenceItem])
async def get_references(
    type: str = Query(..., description="Тип справочника: land_use, land_category"),
    db: AsyncSession = Depends(get_async_db),
):
    """Получить элементы справочника по типу."""
    result = await db.execute(
        select(Reference)
        .where(Reference.type == type)
        .order_by(Reference.sort_order, Reference.name)
    )
    refs = result.scalars().all()
    return refs
