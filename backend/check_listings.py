from app.database import SessionLocal
from app.models.listing import Listing

db = SessionLocal()
try:
    listings = db.query(Listing).all()
    print(f"Total listings: {len(listings)}")
    for l in listings:
        print(f"ID: {l.id}, Slug: '{l.slug}', Published: {l.is_published}")
finally:
    db.close()
