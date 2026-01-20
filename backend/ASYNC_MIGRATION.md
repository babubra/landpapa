# Миграция Backend на Async SQLAlchemy

**✅ МИГРАЦИЯ ЗАВЕРШЕНА — 2026-01-20**

Все 16 роутеров переведены на асинхронную работу с БД через `asyncpg` + `AsyncSession`.

## Инфраструктура

| Файл | Описание |
|------|----------|
| `requirements.txt` | Добавлен `asyncpg` |
| `app/config.py` | Добавлен `async_database_url` property |
| `app/database.py` | Добавлены `async_engine`, `AsyncSessionLocal`, `get_async_db()` |

## Мигрированные роутеры

| Файл | Endpoints |
|------|-----------|
| `references.py` | `GET /` |
| `public_settings.py` | `GET /public` |
| `public_plots.py` | `GET /all`, `GET /count` |
| `listings.py` | `GET /`, `GET /popular`, `GET /{slug}`, `GET /slugs/all` |
| `news.py` | CRUD (7 endpoints) |
| `locations.py` | `GET /districts`, `GET /settlements`, `GET /settlements-grouped` |
| `leads.py` | `POST /public`, `GET /admin`, `PATCH /admin/{id}` |
| `auth.py` | `POST /login`, `GET /me`, `POST /forgot-password`, `POST /reset-password` |
| `admin_listings.py` | CRUD + bulk (8 endpoints) |
| `admin_plots.py` | CRUD + bulk + NSPD (15 endpoints) |
| `admin_settings.py` | CRUD (4 endpoints) |
| `admin_references.py` | CRUD + locations (7 endpoints) |
| `admin_realtors.py` | CRUD (5 endpoints) |
| `admin_geo.py` | `GET /suggest`, `POST /resolve` |
| `images.py` | `POST /upload`, `DELETE /{id}` |

## Исправленные модели (lazy loading)

- `Settlement.district` → `lazy="joined"`
- `Plot.listing` → `lazy="joined"`

## Паттерн миграции

```python
# Импорты
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db

# Dependency
async def endpoint(db: AsyncSession = Depends(get_async_db)):

# Запрос
result = await db.execute(select(Model).where(Model.id == id))
item = result.scalar_one_or_none()

# CRUD
db.add(item)
await db.commit()
await db.refresh(item)
```
