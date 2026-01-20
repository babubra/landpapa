"""
Модуль для работы с базой данных.
Поддерживает как синхронные, так и асинхронные соединения.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

from app.config import settings


# === Синхронный движок (для обратной совместимости) ===
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# === Асинхронный движок ===
async_engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,  # логирование SQL в debug-режиме
)
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # предотвращает проблемы с detached objects
)


class Base(DeclarativeBase):
    """Базовый класс для всех моделей."""
    pass


def get_db():
    """Dependency для получения синхронной сессии БД."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    """Dependency для получения асинхронной сессии БД."""
    async with AsyncSessionLocal() as session:
        yield session
