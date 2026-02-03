"""
API для геолокации и населённых пунктов.
Асинхронная версия.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import re

from app.database import get_async_db
from app.models.location import District, Settlement, Location, LocationType
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.dadata_client import get_dadata_client, DaDataSuggestion

router = APIRouter()

class SuggestionResponse(BaseModel):
    suggestions: list[DaDataSuggestion]

class ResolveRequest(BaseModel):
    name: str # "Поддубное"
    type: str | None = None # "пос"
    district_name: str | None = None # "Гурьевский район"
    district_fias_id: str | None = None
    settlement_fias_id: str | None = None
    region_name: str | None = None # "Калининградская область"

class SettlementResolved(BaseModel):
    id: int
    name: str
    full_name: str

# === Новые модели для resolve-v2 ===
class ResolveV2Request(BaseModel):
    """Запрос для резолва локации в новой иерархии."""
    name: str  # "Поддубное"
    settlement_type: str | None = None  # "п", "г", "пгт"
    settlement_fias_id: str | None = None  # ФИАС ID населённого пункта
    district_name: str | None = None  # "Гурьевский район"
    district_fias_id: str | None = None  # ФИАС ID района
    city_name: str | None = None  # "Калининград" (если это городской округ)
    city_fias_id: str | None = None  # ФИАС ID города

class LocationResolved(BaseModel):
    """Результат резолва — location_id для новой иерархии."""
    location_id: int
    name: str
    full_name: str
    path: list[str]  # ["Калининградская область", "Гурьевский район", "п. Поддубное"]

def slugify(text: str) -> str:
    """
    Простая транслитерация для создания слагов.
    """
    symbols = (u"абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
               u"abvgdeejzijklmnoprstufhzcss_y_euaABVGDEEJZIJKLMNOPRSTUFHZCSS_Y_EUA")
    tr = {ord(a): ord(b) for a, b in zip(*symbols)}
    text = text.translate(tr)
    text = re.sub(r'[^a-zA-Z0-9]', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-').lower()

@router.get("/suggest", response_model=SuggestionResponse)
async def suggest_settlements(
    query: str,
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Proxy request to DaData for settlement suggestions.
    """
    client = get_dadata_client()
    suggestions = await client.suggest_settlement(query)
    return {"suggestions": suggestions}

@router.post("/resolve", response_model=SettlementResolved)
async def resolve_settlement(
    data: ResolveRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Find or create District and Settlement in DB.
    """
    # 1. Find or Create District
    district = None
    if data.district_name:
        # Try finding by FIAS ID first if available
        if data.district_fias_id:
            result = await db.execute(
                select(District).where(District.fias_id == data.district_fias_id)
            )
            district = result.scalar_one_or_none()
        
        # Fallback to Name Check
        if not district:
            result = await db.execute(
                select(District).where(District.name == data.district_name)
            )
            district = result.scalar_one_or_none()
        
        if not district:
            # Create District
            district_slug = slugify(data.district_name)
            # Ensure unique slug
            result = await db.execute(
                select(District).where(District.slug == district_slug)
            )
            if result.scalar_one_or_none():
                district_slug = f"{district_slug}-{data.district_fias_id}" if data.district_fias_id else f"{district_slug}-new"

            district = District(
                name=data.district_name,
                slug=district_slug,
                fias_id=data.district_fias_id,
                sort_order=0
            )
            db.add(district)
            await db.commit()
            await db.refresh(district)

    if not district:
        # Hack for Kaliningrad city which might not have a district in DaData response
        if data.name == "Калининград" or not data.district_name:
            dist_name = "Калининград"
            result = await db.execute(
                select(District).where(District.name == dist_name)
            )
            district = result.scalar_one_or_none()
            if not district:
                district = District(name=dist_name, slug="kaliningrad", sort_order=0)
                db.add(district)
                await db.commit()
                await db.refresh(district)

    # 2. Find or Create Settlement
    settlement = None
    if data.settlement_fias_id:
        result = await db.execute(
            select(Settlement).where(Settlement.fias_id == data.settlement_fias_id)
        )
        settlement = result.scalar_one_or_none()
    
    if not settlement and district:
        # Try logic: Type + Name + District
        result = await db.execute(
            select(Settlement).where(
                Settlement.name == data.name,
                Settlement.district_id == district.id
            )
        )
        settlement = result.scalar_one_or_none()

    if not settlement and district:
        slug_base = slugify(data.name)
        slug = slug_base
        counter = 1
        
        result = await db.execute(
            select(Settlement).where(Settlement.slug == slug)
        )
        while result.scalar_one_or_none():
            slug = f"{slug_base}-{counter}"
            counter += 1
            result = await db.execute(
                select(Settlement).where(Settlement.slug == slug)
            )

        settlement = Settlement(
            name=data.name,
            slug=slug,
            fias_id=data.settlement_fias_id,
            type=data.type,
            district_id=district.id
        )
        db.add(settlement)
        await db.commit()
        await db.refresh(settlement)
    
    if not settlement:
        raise HTTPException(status_code=400, detail="Could not resolve settlement")

    full_name = f"{settlement.type or ''} {settlement.name}, {district.name}"
    return {
        "id": settlement.id,
        "name": settlement.name,
        "full_name": full_name.strip()
    }


# =====================================================
# НОВЫЙ API для работы с Location (иерархия)
# =====================================================

@router.post("/resolve-v2", response_model=LocationResolved)
async def resolve_location_v2(
    data: ResolveV2Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Find or create Location в новой иерархии.
    
    Приоритет поиска: fias_id → name + parent
    Автоматически создаёт недостающие уровни иерархии.
    """
    # 1. Получаем регион (всегда существует)
    result = await db.execute(
        select(Location).where(Location.type == LocationType.REGION)
    )
    region = result.scalar_one_or_none()
    
    if not region:
        raise HTTPException(status_code=500, detail="Region not found in database")
    
    path = [region.name]
    parent_location = region
    
    # 2. Определяем: это городской округ или район?
    if data.city_name and data.city_fias_id:
        # Это городской округ (Калининград, Пионерский, Светлогорск, Янтарный)
        city = await _find_or_create_location(
            db=db,
            name=data.city_name,
            slug=slugify(data.city_name),
            location_type=LocationType.CITY,
            fias_id=data.city_fias_id,
            parent_id=region.id,
            settlement_type=data.settlement_type,
        )
        path.append(f"{data.settlement_type}. {city.name}" if data.settlement_type else city.name)
        
        # Для городских округов — сам город и есть конечная локация
        return LocationResolved(
            location_id=city.id,
            name=city.name,
            full_name=", ".join(reversed(path)),
            path=path,
        )
    
    # 3. Это район
    if data.district_name:
        district = await _find_or_create_location(
            db=db,
            name=data.district_name,
            slug=slugify(data.district_name),
            location_type=LocationType.DISTRICT,
            fias_id=data.district_fias_id,
            parent_id=region.id,
        )
        path.append(district.name)
        parent_location = district
    else:
        raise HTTPException(status_code=400, detail="district_name or city_name is required")
    
    # 4. Создаём населённый пункт внутри района
    settlement = await _find_or_create_location(
        db=db,
        name=data.name,
        slug=slugify(data.name),
        location_type=LocationType.SETTLEMENT,
        fias_id=data.settlement_fias_id,
        parent_id=parent_location.id,
        settlement_type=data.settlement_type,
    )
    
    formatted_name = f"{data.settlement_type}. {settlement.name}" if data.settlement_type else settlement.name
    path.append(formatted_name)
    
    return LocationResolved(
        location_id=settlement.id,
        name=settlement.name,
        full_name=", ".join(reversed(path)),
        path=path,
    )


async def _find_or_create_location(
    db: AsyncSession,
    name: str,
    slug: str,
    location_type: LocationType,
    parent_id: int,
    fias_id: str | None = None,
    settlement_type: str | None = None,
) -> Location:
    """
    Найти или создать локацию.
    Приоритет: fias_id → name + parent_id
    """
    location = None
    
    # 1. Поиск по fias_id (приоритет)
    if fias_id:
        result = await db.execute(
            select(Location).where(Location.fias_id == fias_id)
        )
        location = result.scalar_one_or_none()
    
    # 2. Поиск по name + parent_id
    if not location:
        result = await db.execute(
            select(Location).where(
                Location.name == name,
                Location.parent_id == parent_id,
            )
        )
        location = result.scalar_one_or_none()
    
    # 3. Создаём новую
    if not location:
        # Генерируем уникальный slug
        base_slug = slug
        counter = 1
        while True:
            result = await db.execute(
                select(Location).where(Location.slug == slug)
            )
            if not result.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        location = Location(
            name=name,
            slug=slug,
            type=location_type,
            fias_id=fias_id,
            parent_id=parent_id,
            settlement_type=settlement_type,
            sort_order=0,
        )
        db.add(location)
        await db.commit()
        await db.refresh(location)
    
    return location

