"""
Админские эндпоинты для справочников.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.routers.auth import get_current_user
from app.models.reference import Reference
from app.models.location import District, Settlement
from app.models.listing import Listing
from app.models.admin_user import AdminUser
from app.models.plot import Plot

router = APIRouter()


# === Схемы ===

class ReferenceItem(BaseModel):
    """Элемент справочника."""
    id: int
    type: str
    code: str
    name: str
    description: str | None = None
    sort_order: int = 0

    class Config:
        from_attributes = True


class ReferenceCreate(BaseModel):
    """Создание элемента справочника."""
    type: str
    code: str
    name: str
    description: str | None = None
    sort_order: int = 0


class ReferenceUpdate(BaseModel):
    """Обновление элемента справочника."""
    code: str | None = None
    name: str | None = None
    description: str | None = None
    sort_order: int | None = None


class DistrictItem(BaseModel):
    """Район."""
    id: int
    name: str
    slug: str
    fias_id: str | None
    sort_order: int
    settlements_count: int = 0

    class Config:
        from_attributes = True


class SettlementItem(BaseModel):
    """Населённый пункт."""
    id: int
    name: str
    slug: str
    type: str | None
    district_id: int
    district_name: str
    fias_id: str | None
    sort_order: int

    class Config:
        from_attributes = True


class ReferenceUsage(BaseModel):
    """Информация об использовании элемента справочника."""
    plots_count: int


# === Справочники (CRUD) ===

@router.get("/", response_model=list[ReferenceItem])
async def list_references(
    type: str = Query(..., description="Тип справочника: land_use, land_category"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить элементы справочника по типу."""
    result = await db.execute(
        select(Reference)
        .where(Reference.type == type)
        .order_by(Reference.sort_order, Reference.name)
    )
    refs = result.scalars().all()
    return refs


@router.post("/", response_model=ReferenceItem)
async def create_reference(
    data: ReferenceCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Создать элемент справочника."""
    ref = Reference(
        type=data.type,
        code=data.code,
        name=data.name,
        description=data.description,
        sort_order=data.sort_order,
    )
    db.add(ref)
    await db.commit()
    await db.refresh(ref)
    return ref


@router.put("/{ref_id}", response_model=ReferenceItem)
async def update_reference(
    ref_id: int,
    data: ReferenceUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Обновить элемент справочника."""
    result = await db.execute(
        select(Reference).where(Reference.id == ref_id)
    )
    ref = result.scalar_one_or_none()
    
    if not ref:
        raise HTTPException(status_code=404, detail="Элемент справочника не найден")
    
    if data.code is not None:
        ref.code = data.code
    if data.name is not None:
        ref.name = data.name
    if data.description is not None:
        ref.description = data.description
    if data.sort_order is not None:
        ref.sort_order = data.sort_order
    
    await db.commit()
    await db.refresh(ref)
    return ref


@router.get("/{ref_id}/usage", response_model=ReferenceUsage)
async def get_reference_usage(
    ref_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить информацию об использовании элемента справочника."""
    result = await db.execute(
        select(Reference).where(Reference.id == ref_id)
    )
    ref = result.scalar_one_or_none()
    
    if not ref:
        raise HTTPException(status_code=404, detail="Элемент справочника не найден")
    
    # Считаем использование в участках
    plots_count = 0
    if ref.type == "land_use":
        result = await db.execute(
            select(func.count(Plot.id)).where(Plot.land_use_id == ref_id)
        )
        plots_count = result.scalar() or 0
    elif ref.type == "land_category":
        result = await db.execute(
            select(func.count(Plot.id)).where(Plot.land_category_id == ref_id)
        )
        plots_count = result.scalar() or 0
    
    return ReferenceUsage(plots_count=plots_count)


@router.delete("/{ref_id}")
async def delete_reference(
    ref_id: int,
    force: bool = Query(False, description="Удалить принудительно (SET NULL для связей)"),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Удалить элемент справочника."""
    result = await db.execute(
        select(Reference).where(Reference.id == ref_id)
    )
    ref = result.scalar_one_or_none()
    
    if not ref:
        raise HTTPException(status_code=404, detail="Элемент справочника не найден")
    
    # Проверяем использование
    plots_count = 0
    if ref.type == "land_use":
        result = await db.execute(
            select(func.count(Plot.id)).where(Plot.land_use_id == ref_id)
        )
        plots_count = result.scalar() or 0
    elif ref.type == "land_category":
        result = await db.execute(
            select(func.count(Plot.id)).where(Plot.land_category_id == ref_id)
        )
        plots_count = result.scalar() or 0
    
    if plots_count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail=f"Элемент используется в {plots_count} участках. Используйте force=true для удаления."
        )
    
    # SET NULL для связанных участков
    if plots_count > 0:
        if ref.type == "land_use":
            await db.execute(
                update(Plot).where(Plot.land_use_id == ref_id).values(land_use_id=None)
            )
        elif ref.type == "land_category":
            await db.execute(
                update(Plot).where(Plot.land_category_id == ref_id).values(land_category_id=None)
            )
    
    await db.delete(ref)
    await db.commit()
    return {"success": True, "affected_plots": plots_count}


# === Районы (только чтение) ===

@router.get("/districts", response_model=list[DistrictItem])
async def list_districts(
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список районов."""
    result = await db.execute(
        select(
            District,
            func.count(Settlement.id).label("settlements_count")
        )
        .outerjoin(Settlement, District.id == Settlement.district_id)
        .group_by(District.id)
        .order_by(District.sort_order, District.name)
    )
    districts = result.all()
    
    return [
        DistrictItem(
            id=district.id,
            name=district.name,
            slug=district.slug,
            fias_id=district.fias_id,
            sort_order=district.sort_order,
            settlements_count=count,
        )
        for district, count in districts
    ]


# === Населённые пункты (только чтение) ===

@router.get("/settlements", response_model=list[SettlementItem])
async def list_settlements(
    district_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """Получить список населённых пунктов."""
    query = (
        select(Settlement, District.name)
        .join(District, Settlement.district_id == District.id)
        .order_by(District.name, Settlement.name)
    )
    
    if district_id:
        query = query.where(Settlement.district_id == district_id)
    
    result = await db.execute(query)
    settlements = result.all()
    
    return [
        SettlementItem(
            id=settlement.id,
            name=settlement.name,
            slug=settlement.slug,
            type=settlement.type,
            district_id=settlement.district_id,
            district_name=district_name,
            fias_id=settlement.fias_id,
            sort_order=settlement.sort_order,
        )
        for settlement, district_name in settlements
    ]
