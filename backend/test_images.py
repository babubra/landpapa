"""Тестовый скрипт для проверки связи images в Listing."""
from app.database import SessionLocal
from app.models.listing import Listing
from app.models.image import Image

db = SessionLocal()

# Получаем листинг
listing = db.query(Listing).filter(Listing.id == 10).first()
print(f"Listing: id={listing.id}, title={listing.title}")
print(f"Images via relationship: {listing.images}")
print(f"Main image: {listing.main_image}")

# Прямой запрос к изображениям
images = db.query(Image).filter(
    Image.entity_type == "listing",
    Image.entity_id == 10
).all()
print(f"Images via direct query: {images}")

for img in images:
    print(f"  - id={img.id}, is_main={img.is_main}, url={img.url[:50]}...")

db.close()
