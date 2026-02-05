"""
API для управления иерархией локаций (админка).
Новая архитектура: Region -> District/City -> Settlement
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
import re

from app.database import get_async_db
from app.models.location import Location, LocationType
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user

router = APIRouter()


# === Pydantic Schemas ===

class LocationBase(BaseModel):
    name: str
    slug: str
    type: LocationType
    parent_id: int | None = None
    settlement_type: str | None = None  # "г", "пос", "пгт", "с"
    fias_id: str | None = None
    sort_order: int = 0
    name_locative: str | None = None  # SEO: "в Калининграде"
    description: str | None = None  # SEO: описание локации


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: int | None = None
    settlement_type: str | None = None
    fias_id: str | None = None
    sort_order: int | None = None
    name_locative: str | None = None  # SEO: "в Калининграде"
    description: str | None = None  # SEO: описание локации


class LocationItem(LocationBase):
    id: int
    children_count: int = 0
    name_locative: str | None = None
    
    class Config:
        from_attributes = True


class LocationTree(BaseModel):
    """Локация с вложенными детьми для дерева."""
    id: int
    name: str
    slug: str
    type: LocationType
    settlement_type: str | None = None
    children: list["LocationTree"] = []
    
    class Config:
        from_attributes = True


# === Utility Functions ===

def slugify(text: str) -> str:
    """Простая транслитерация для создания слагов."""
    symbols = (
        "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
        "abvgdeejzijklmnoprstufhzcss_y_euaABVGDEEJZIJKLMNOPRSTUFHZCSS_Y_EUA"
    )
    tr = {ord(a): ord(b) for a, b in zip(*symbols)}
    text = text.translate(tr)
    text = re.sub(r'[^a-zA-Z0-9]', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-').lower()


# === API Endpoints ===

@router.get("/", response_model=list[LocationItem])
async def list_locations(
    type: LocationType | None = None,
    parent_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список локаций с фильтрацией."""
    query = select(Location)
    
    if type:
        query = query.where(Location.type == type)
    if parent_id is not None:
        query = query.where(Location.parent_id == parent_id)
    
    query = query.order_by(Location.sort_order, Location.name)
    
    result = await db.execute(query)
    locations = result.scalars().all()
    
    # Подсчёт детей для каждой локации
    items = []
    for loc in locations:
        children_count_result = await db.execute(
            select(func.count(Location.id)).where(Location.parent_id == loc.id)
        )
        children_count = children_count_result.scalar() or 0
        
        items.append(LocationItem(
            id=loc.id,
            name=loc.name,
            slug=loc.slug,
            type=loc.type,
            parent_id=loc.parent_id,
            settlement_type=loc.settlement_type,
            fias_id=loc.fias_id,
            sort_order=loc.sort_order,
            children_count=children_count,
        ))
    
    return items


@router.get("/tree", response_model=list[LocationTree])
async def get_location_tree(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить дерево локаций для админки."""
    # Получаем все локации
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.children))
        .order_by(Location.sort_order, Location.name)
    )
    locations = result.scalars().unique().all()
    
    # Строим дерево
    def build_tree(parent_id: int | None) -> list[LocationTree]:
        children = [loc for loc in locations if loc.parent_id == parent_id]
        return [
            LocationTree(
                id=loc.id,
                name=loc.name,
                slug=loc.slug,
                type=loc.type,
                settlement_type=loc.settlement_type,
                children=build_tree(loc.id),
            )
            for loc in children
        ]
    
    return build_tree(None)


@router.get("/{location_id}", response_model=LocationItem)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить локацию по ID."""
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Подсчёт детей
    children_count_result = await db.execute(
        select(func.count(Location.id)).where(Location.parent_id == location.id)
    )
    children_count = children_count_result.scalar() or 0
    
    return LocationItem(
        id=location.id,
        name=location.name,
        slug=location.slug,
        type=location.type,
        parent_id=location.parent_id,
        settlement_type=location.settlement_type,
        fias_id=location.fias_id,
        sort_order=location.sort_order,
        children_count=children_count,
    )


@router.post("/", response_model=LocationItem)
async def create_location(
    data: LocationCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать новую локацию."""
    # Проверка уникальности slug
    existing = await db.execute(
        select(Location).where(Location.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    # Проверка parent_id
    if data.parent_id:
        parent_result = await db.execute(
            select(Location).where(Location.id == data.parent_id)
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Parent location not found")
    
    location = Location(
        name=data.name,
        slug=data.slug,
        type=data.type,
        parent_id=data.parent_id,
        settlement_type=data.settlement_type,
        fias_id=data.fias_id,
        sort_order=data.sort_order,
        name_locative=data.name_locative,
    )
    db.add(location)
    await db.commit()
    await db.refresh(location)
    
    return LocationItem(
        id=location.id,
        name=location.name,
        slug=location.slug,
        type=location.type,
        parent_id=location.parent_id,
        settlement_type=location.settlement_type,
        fias_id=location.fias_id,
        sort_order=location.sort_order,
        children_count=0,
    )


@router.patch("/{location_id}", response_model=LocationItem)
async def update_location(
    location_id: int,
    data: LocationUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить локацию."""
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Проверка уникальности slug
    if data.slug and data.slug != location.slug:
        existing = await db.execute(
            select(Location).where(Location.slug == data.slug)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    # Применяем обновления
    if data.name is not None:
        location.name = data.name
    if data.slug is not None:
        location.slug = data.slug
    if data.parent_id is not None:
        location.parent_id = data.parent_id
    if data.settlement_type is not None:
        location.settlement_type = data.settlement_type
    if data.fias_id is not None:
        location.fias_id = data.fias_id
    if data.sort_order is not None:
        location.sort_order = data.sort_order
    if data.name_locative is not None:
        location.name_locative = data.name_locative
    if data.description is not None:
        location.description = data.description
    
    await db.commit()
    await db.refresh(location)
    
    # Подсчёт детей
    children_count_result = await db.execute(
        select(func.count(Location.id)).where(Location.parent_id == location.id)
    )
    children_count = children_count_result.scalar() or 0
    
    return LocationItem(
        id=location.id,
        name=location.name,
        slug=location.slug,
        type=location.type,
        parent_id=location.parent_id,
        settlement_type=location.settlement_type,
        fias_id=location.fias_id,
        sort_order=location.sort_order,
        children_count=children_count,
    )


@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить локацию (только если нет children и listings)."""
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Проверка наличия детей
    children_count_result = await db.execute(
        select(func.count(Location.id)).where(Location.parent_id == location.id)
    )
    if children_count_result.scalar() > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete location with children. Remove children first."
        )
    
    # TODO: Проверка наличия listings с этой локацией
    
    await db.delete(location)
    await db.commit()
    
    return {"message": "Location deleted"}


@router.post("/generate-slug")
async def generate_slug(
    name: str,
    current_user: AdminUser = Depends(get_current_user),
):
    """Сгенерировать slug из названия."""
    return {"slug": slugify(name)}
