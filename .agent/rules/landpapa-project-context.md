---
trigger: always_on
---

# LandPapa Project Context & Workflow

## Core Architecture
This is a full-stack real estate platform (LandPapa) consisting of:
- **Backend**: FastAPI (Python) located in `/backend`. Uses PostgreSQL with PostGIS.
- **Frontend**: Next.js (Website) located in `/kaliningrad-land`.
- **Admin**: Next.js (Management Panel) located in `/admin`.

## Local Development Workflow (Linux/WSL)
- **Primary Setup**: Always refer to `README.md` for overall logic, but use `dev.sh` for executions in this Linux environment.
- **Service Management**: Use `./dev.sh` in the root directory to start the entire stack (Database via Docker, Backend, Frontend, and Admin).
- **Environment Variables**: Local configuration is stored in `.env` in the root and respective subdirectories.
- **Backend**: Python virtual environment is located at `backend/venv/bin/python`.
- **Database**: PostgreSQL (PostGIS) is running in Docker on port 5432.

## Important Note for Agent
Before proposing any changes to the architecture or start-up scripts, always check the existing `dev.sh` logic. When assisting with development, ensure that Python commands use the virtual environment path and Node commands are executed in the correct subdirectories.

# 🗺️ Project Map & Glossary

This section serves as a "guidebook" for AI models and developers, linking business entities to specific code files.

## Business-to-Code Glossary (Глоссарий)

| Context / Module (RU) | Key Files (Frontend) | Key Files (Backend) |
| :--- | :--- | :--- |
| **Каталог (Страница списка)** | `kaliningrad-land/src/app/catalog/page.tsx` | `backend/app/routers/listings.py` |
| — *Фильтры каталога* | `kaliningrad-land/src/components/catalog/CatalogFilters.tsx` | — |
| — *Карточка участка* | `kaliningrad-land/src/components/catalog/ListingCard.tsx` | `backend/app/schemas/listing.py` |
| **Детальная страница участка** | `kaliningrad-land/src/app/listing/[slug]/page.tsx` | `backend/app/routers/listings.py` |
| — *Галерея фото* | `kaliningrad-land/src/components/listing/ListingGallery.tsx` | `backend/app/models/image.py` |
| — *Карта на странице* | `kaliningrad-land/src/components/listing/ListingMap.tsx` | — |
| **Интерактивная Карта (Search)** | `kaliningrad-land/src/app/map/page.tsx` | `backend/app/routers/public_plots.py` |
| — *Логика карты (Leaflet)* | `kaliningrad-land/src/components/map/ListingsMap.tsx` | — |
| **Главная страница** | `kaliningrad-land/src/app/page.tsx` | — |
| — *Верхний слайдер* | `kaliningrad-land/src/components/home/AboutCarousel.tsx` | — |
| — *Популярные участки* | `kaliningrad-land/src/components/home/PopularPlotsSection.tsx` | — |
| **Админка: Участки** | `admin/src/app/plots/page.tsx` | `backend/app/routers/admin_plots.py` |
| — *Импорт/Обновление из NSPD*| — | `backend/app/nspd_client.py` |
| **Админка: Настройки сайта** | `admin/src/app/settings/page.tsx` | `backend/app/routers/admin_settings.py` |

## Detailed Structure

### 1. Frontend: Website (`kaliningrad-land`)
Main public Next.js site.

*   **Pages (`src/app`):**
    *   `/` (Home) — Landing with promo blocks.
    *   `/catalog` — Main listings with filtration (SSR + Client interaction).
    *   `/map` — Fullscreen map search.
    *   `/listing/[slug]` — Detailed offer card.
    *   `/news` — Blog/News.
    *   `/contacts` — Contacts page.

*   **Components (`src/components`):**
    *   `catalog/` — Listing displays (filters, sorting).
    *   `map/` — Interactive map logic (clustering, pins, popups).
    *   `listing/` — Detail page blocks (features, similar items).
    *   `ui/` — Base UI kits (shadcn/ui).

### 2. Frontend: Admin Panel (`admin`)
Management panel for managers. Next.js.

*   **Sections (`src/app`):**
    *   `/plots` — Registry of all cadastral plots (raw Rosreestr data).
    *   `/listings` — Published listings (merchandise).
    *   `/settings` — Global settings (contacts, SEO templates).
    *   `/leads` — Site leads/requests.

*   **Key Components:**
    *   `src/components/plots/AdminPlotsMap.tsx` — Geometry editor and map view.
    *   `src/components/plots/BulkImportModal.tsx` — Batch upload of cadastral numbers.

### 3. Backend: API (`backend`)
REST API on FastAPI + PostgreSQL (PostGIS).

*   **Routers (`app/routers`):**
    *   `public_plots.py` — Geo-search for site map (optimized GeoJSON).
    *   `listings.py` — Listing search and filtering for catalog.
    *   `admin_*.py` — CRUD operations for admin (auth protected).
    *   `nspd_client.py` — Client for parsing data from NSPD/Rosreestr.

*   **Models (`app/models`):**
    *   `Plot` (plot.py) — Base plot entity (cadastral, geometry).
    *   `Listing` (listing.py) — Commercial offer (price, description, status).
    *   `Image` (image.py) — Photos and layouts.

### 4. Dev Cheatsheet
*   **Start Stack:** `./dev.sh` (root, Linux/WSL).
*   **Backend:** `cd backend && venv\Scripts\uvicorn.exe app.main:app --reload` (Windows).
*   **Frontend:** `cd kaliningrad-land && npm run dev`.
*   **Admin:** `cd admin && npm run dev`.
