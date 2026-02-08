from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import news, listings, locations, references, auth, admin_plots, admin_settings, admin_listings, admin_geo, images, admin_references, admin_realtors, public_settings, leads, public_plots, admin_locations, admin_users

app = FastAPI(
    title="КалининградЗем API",
    description="API для сайта продажи земельных участков",
    version="1.0.0",
)

# Админские роутеры
app.include_router(admin_plots.router, prefix="/api/admin/plots", tags=["admin-plots"])
app.include_router(admin_settings.router, prefix="/api/admin/settings", tags=["admin-settings"])
app.include_router(admin_listings.router, prefix="/api/admin/listings", tags=["admin-listings"])
app.include_router(admin_geo.router, prefix="/api/admin/geo", tags=["admin-geo"])
app.include_router(images.router, prefix="/api/admin/images", tags=["admin-images"])
app.include_router(admin_references.router, prefix="/api/admin/references", tags=["admin-references"])
app.include_router(admin_realtors.router, prefix="/api/admin/realtors", tags=["admin-realtors"])
app.include_router(leads.router, prefix="/api/admin/leads", tags=["admin-leads"])
app.include_router(admin_locations.router, prefix="/api/admin/locations", tags=["admin-locations"])
app.include_router(admin_users.router, prefix="/api/admin/users", tags=["admin-users"])

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# CORS configuration
print(f"DEBUG: Loaded CORS origins: {settings.cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Доверяем прокси-заголовкам (X-Forwarded-Proto и т.д.)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Создаем папку загрузок если нет
if not os.path.exists(settings.upload_dir):
    os.makedirs(settings.upload_dir)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Публичные роутеры
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
app.include_router(references.router, prefix="/api/references", tags=["references"])
app.include_router(public_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(public_plots.router, prefix="/api/public-plots", tags=["public-plots"])


@app.get("/")
async def root():
    return {"message": "КалининградЗем API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
