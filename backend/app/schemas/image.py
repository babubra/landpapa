from pydantic import BaseModel
from datetime import datetime

class ImageItem(BaseModel):
    id: int
    url: str
    thumbnail_url: str | None
    original_filename: str | None
    mime_type: str | None
    size: int | None
    width: int | None
    height: int | None
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True
