"""
Сервис для генерации скриншотов карты объявлений.
Использует Playwright для рендеринга страницы и создания скриншота.
"""

import asyncio
import os
import uuid
from pathlib import Path
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.image import Image
from app.models.listing import Listing
from app.config import settings


class ScreenshotService:
    """Сервис генерации скриншотов карты."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.output_dir = Path(settings.upload_dir) / "generated"
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    async def generate_map_screenshot(
        self,
        listing_id: int,
        frontend_url: str = "http://localhost:3000"
    ) -> Image | None:
        """
        Генерирует скриншот карты для объявления.
        
        Args:
            listing_id: ID объявления
            frontend_url: URL фронтенда для рендеринга
            
        Returns:
            Image: созданная запись изображения или None при ошибке
        """
        # Получаем объявление
        result = await self.db.execute(
            select(Listing).where(Listing.id == listing_id)
        )
        listing = result.scalar_one_or_none()
        
        if not listing:
            return None
        
        # URL страницы для скриншота
        screenshot_url = f"{frontend_url}/listing-screenshot/{listing.slug}"
        
        # Генерируем имя файла
        filename = f"map_{listing_id}_{uuid.uuid4().hex[:8]}.png"
        filepath = self.output_dir / filename
        
        try:
            # Импортируем playwright только при использовании
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={"width": 1200, "height": 630})
                
                # Открываем страницу
                await page.goto(screenshot_url, wait_until="networkidle")
                
                # Ждём сигнала готовности карты
                try:
                    await page.wait_for_function(
                        "window.__MAP_READY__ === true",
                        timeout=15000  # 15 секунд максимум
                    )
                except Exception:
                    # Если сигнал не пришёл, ждём дополнительно
                    await asyncio.sleep(3)
                
                # Делаем скриншот контейнера
                container = page.locator("#screenshot-container")
                await container.screenshot(path=str(filepath))
                
                await browser.close()
        
        except Exception as e:
            print(f"Screenshot generation error: {e}")
            return None
        
        # Создаём запись изображения в БД
        # Формируем URL относительно uploads
        relative_url = f"/uploads/generated/{filename}"
        
        image = Image(
            entity_type="listing",
            entity_id=listing_id,
            url=relative_url,
            thumbnail_url=relative_url,  # Для скриншотов одинаковый
            original_filename=filename,
            mime_type="image/png",
            width=1200,
            height=630,
            alt=f"Карта участков объявления {listing.title}",
            is_main=False,  # Не делаем главным автоматически
            sort_order=999,  # В конец
            created_at=datetime.utcnow(),
        )
        
        self.db.add(image)
        await self.db.commit()
        await self.db.refresh(image)
        
        return image
    
    async def bulk_generate_screenshots(
        self,
        listing_ids: list[int],
        frontend_url: str = "http://localhost:3000",
        only_without_images: bool = True
    ) -> dict:
        """
        Массовая генерация скриншотов для нескольких объявлений.
        
        Args:
            listing_ids: список ID объявлений
            frontend_url: URL фронтенда
            only_without_images: генерировать только для объявлений без изображений
            
        Returns:
            dict: статистика выполнения
        """
        stats = {
            "total": len(listing_ids),
            "success": 0,
            "skipped": 0,
            "failed": 0,
            "generated_ids": [],
        }
        
        for listing_id in listing_ids:
            # Проверяем, есть ли уже изображения
            if only_without_images:
                result = await self.db.execute(
                    select(Image).where(
                        Image.entity_type == "listing",
                        Image.entity_id == listing_id
                    ).limit(1)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    stats["skipped"] += 1
                    continue
            
            # Генерируем скриншот
            image = await self.generate_map_screenshot(listing_id, frontend_url)
            
            if image:
                stats["success"] += 1
                stats["generated_ids"].append(image.id)
            else:
                stats["failed"] += 1
        
        return stats
