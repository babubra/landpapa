from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
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
    db: Session = Depends(get_db),
):
    """Получить элементы справочника по типу."""
    refs = (
        db.query(Reference)
        .filter(Reference.type == type)
        .order_by(Reference.sort_order, Reference.name)
        .all()
    )
    return refs
