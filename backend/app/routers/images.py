"""
API для управления изображениями.
Асинхронная версия.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from app.models.image import Image
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_user
from app.config import settings
from app.schemas.image import ImageItem
import uuid
import os
import shutil
from PIL import Image as PILImage, ImageOps

router = APIRouter()

@router.post("/upload", response_model=ImageItem)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Загрузка изображения (админ).
    Валидирует тип, генерирует UUID имя, создает миниатюру 300x300.
    """
    # Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid file type")
    
    # Save original
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".jpg"
        
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)
    
    # Write file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
         raise HTTPException(500, f"File write failed: {str(e)}")
        
    # Process with Pillow
    width = 0
    height = 0
    thumb_filename = None
    
    try:
        with PILImage.open(filepath) as img:
            # Fix orientation (EXIF)
            img = ImageOps.exif_transpose(img)
            width, height = img.size
            
            # Create thumbnail
            thumb_filename = f"thumb_{filename}"
            thumb_path = os.path.join(settings.upload_dir, thumb_filename)
            
            # Smart crop to 300x300
            thumb = ImageOps.fit(img, (300, 300), PILImage.Resampling.LANCZOS)
            thumb.save(thumb_path)
            
    except Exception as e:
        # Cleanup if failed
        if os.path.exists(filepath): os.remove(filepath)
        raise HTTPException(500, f"Image processing failed: {str(e)}")
        
    # Create DB record
    db_image = Image(
        url=f"/uploads/{filename}",
        thumbnail_url=f"/uploads/{thumb_filename}" if thumb_filename else None,
        original_filename=file.filename,
        mime_type=file.content_type,
        size=os.path.getsize(filepath),
        width=width,
        height=height,
        entity_type=None,
        entity_id=None
    )
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    
    return db_image


@router.delete("/{image_id}", status_code=204)
async def delete_image(
    image_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Удаление изображения и файлов."""
    result = await db.execute(
        select(Image).where(Image.id == image_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(404, "Image not found")
        
    # Delete files
    try:
        if image.url:
            filename = os.path.basename(image.url)
            filepath = os.path.join(settings.upload_dir, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
            
        if image.thumbnail_url:
            thumb_name = os.path.basename(image.thumbnail_url)
            thumb_path = os.path.join(settings.upload_dir, thumb_name)
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
    except Exception as e:
        print(f"Error deleting files: {e}")
        
    await db.delete(image)
    await db.commit()
