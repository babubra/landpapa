from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import news, listings, locations, references, auth, admin_plots, admin_settings, admin_listings, admin_geo

app = FastAPI(
    title="КалининградЗем API",
    description="API для сайта продажи земельных участков",
    version="1.0.0",
)

# CORS configuration
print(f"DEBUG: Loaded CORS origins: {settings.cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Публичные роутеры
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
app.include_router(references.router, prefix="/api/references", tags=["references"])

# Админские роутеры
app.include_router(admin_plots.router, prefix="/api/admin/plots", tags=["admin-plots"])
app.include_router(admin_settings.router, prefix="/api/admin/settings", tags=["admin-settings"])
app.include_router(admin_listings.router, prefix="/api/admin/listings", tags=["admin-listings"])
app.include_router(admin_geo.router, prefix="/api/admin/geo", tags=["admin-geo"])


@app.get("/")
async def root():
    return {"message": "КалининградЗем API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
