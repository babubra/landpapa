from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
import re

from app.database import get_db
from app.models.location import District, Settlement
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
    db: Session = Depends(get_db),
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
            district = db.query(District).filter(District.fias_id == data.district_fias_id).first()
        
        # Fallback to Name Check
        if not district:
            # Clean name (remove "район", "округ" etc for flexible matching if needed, 
            # but usually DaData returns consistent names)
            district = db.query(District).filter(District.name == data.district_name).first()
        
        if not district:
            # Create District
            district_slug = slugify(data.district_name)
            # Ensure unique slug
            if db.query(District).filter(District.slug == district_slug).first():
                district_slug = f"{district_slug}-{data.district_fias_id}" if data.district_fias_id else f"{district_slug}-new"

            district = District(
                name=data.district_name,
                slug=district_slug,
                fias_id=data.district_fias_id,
                sort_order=0
            )
            db.add(district)
            db.commit()
            db.refresh(district)

    if not district:
         # Если район не пришел (например, Калининград), возможно это город областного значения
         # В нашей модели Settlement привязан к District.
         # Нужно либо создать "Городской округ Калининград" как District, либо иметь District "Областные города".
         # Для простоты, если district_name пустое, попробуем найти/создать район по имени населенного пункта (напр. "Калининград")
         # или используем "Калининградский городской округ" если регион указан.
         # DaData обычно возвращает area (район) или city_district. Если пусто - значит это City.
         
         # Hack for Kaliningrad city which might not have a district in DaData response
         if data.name == "Калининград" or not data.district_name:
             dist_name = "Калининград"
             district = db.query(District).filter(District.name == dist_name).first()
             if not district:
                 district = District(name=dist_name, slug="kaliningrad", sort_order=0)
                 db.add(district)
                 db.commit()
                 db.refresh(district)

    # 2. Find or Create Settlement
    settlement = None
    if data.settlement_fias_id:
        settlement = db.query(Settlement).filter(Settlement.fias_id == data.settlement_fias_id).first()
    
    if not settlement and district:
        # Try logic: Type + Name + District
        settlement = db.query(Settlement).filter(
            Settlement.name == data.name,
            Settlement.district_id == district.id
        ).first()

    if not settlement and district:
        slug_base = slugify(data.name)
        slug = slug_base
        counter = 1
        while db.query(Settlement).filter(Settlement.slug == slug).first():
            slug = f"{slug_base}-{counter}"
            counter += 1

        settlement = Settlement(
            name=data.name,
            slug=slug,
            fias_id=data.settlement_fias_id,
            type=data.type,
            district_id=district.id
        )
        db.add(settlement)
        db.commit()
        db.refresh(settlement)
    
    if not settlement:
        raise HTTPException(status_code=400, detail="Could not resolve settlement")

    full_name = f"{settlement.type or ''} {settlement.name}, {district.name}"
    return {
        "id": settlement.id,
        "name": settlement.name,
        "full_name": full_name.strip()
    }
