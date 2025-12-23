from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import news, listings

app = FastAPI(
    title="КалининградЗем API",
    description="API для сайта продажи земельных участков",
    version="1.0.0",
)

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])


@app.get("/")
async def root():
    return {"message": "КалининградЗем API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
