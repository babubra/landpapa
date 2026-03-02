"""
Публичный API для SEO-блоков на главной странице.
Возвращает активные блоки с подобранными листингами.
"""

import math
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.seo_block import SeoBlock
from app.models.listing import Listing
from app.models.plot import Plot, PlotStatus
from app.models.location import Location
from app.models.reference import Reference
from app.schemas.seo_block import SeoBlockPublic

router = APIRouter()


async def _get_listings_for_block(
    block: SeoBlock,
    db: AsyncSession,
    limit: int = 4,
) -> list[Listing]:
    """
    Подбор листингов для SEO-блока.
    
    Логика: сначала is_featured=True, затем самые свежие.
    Фильтры: location_id (иерархия) + land_use_filter (код из references).
    """
    # Подзапрос: ID листингов с активными участками
    active_plots_query = select(Plot.listing_id).where(
        Plot.status == PlotStatus.active
    )

    # Фильтр по типу земли (land_use_filter → reference.code)
    if block.land_use_filter:
        active_plots_query = active_plots_query.join(
            Reference, Plot.land_use_id == Reference.id
        ).where(Reference.code == block.land_use_filter)

    active_listings_ids = active_plots_query.distinct().subquery()

    # Основной запрос
    query = (
        select(Listing)
        .options(
            selectinload(Listing.location).selectinload(Location.parent)
        )
        .where(Listing.is_published == True)
        .where(Listing.id.in_(select(active_listings_ids.c.listing_id)))
    )

    # Фильтр по локации (рекурсивный CTE — район + все дочерние)
    if block.location_id:
        cte = (
            select(Location.id)
            .where(Location.id == block.location_id)
            .cte("location_tree", recursive=True)
        )
        cte = cte.union_all(
            select(Location.id).join(cte, Location.parent_id == cte.c.id)
        )
        all_location_ids = select(cte.c.id)
        query = query.where(Listing.location_id.in_(all_location_ids))

    # Сортировка: featured первые, потом по дате
    query = query.order_by(
        desc(Listing.is_featured),
        desc(Listing.created_at),
    ).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/seo-blocks", response_model=list[SeoBlockPublic])
async def get_seo_blocks(
    db: AsyncSession = Depends(get_async_db),
):
    """Получить активные SEO-блоки с подобранными листингами."""
    # 1. Берём все активные блоки
    result = await db.execute(
        select(SeoBlock)
        .where(SeoBlock.is_active == True)
        .order_by(SeoBlock.sort_order)
    )
    blocks = result.scalars().all()

    # 2. Для каждого блока подбираем листинги
    response = []
    for block in blocks:
        listings = await _get_listings_for_block(block, db)
        response.append(
            SeoBlockPublic(
                id=block.id,
                title=block.title,
                subtitle=block.subtitle,
                description=block.description,
                link_url=block.link_url,
                listings=listings,
            )
        )

    return response
