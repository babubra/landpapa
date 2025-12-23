# КалининградЗем — Инструкция по запуску

## Структура проекта

```
Test1/
├── backend/              # FastAPI (Python)
├── kaliningrad-land/     # Next.js (Frontend)
├── docker-compose.yml    # PostgreSQL + PostGIS
└── .gitignore
```

---

## 1. Запуск базы данных (PostgreSQL + PostGIS)

```bash
cd c:\Users\babubra\TestProjects\Test1
docker compose up -d db
```

Проверка:
```bash
docker compose ps
```

---

## 2. Запуск Backend (FastAPI)

```bash
cd c:\Users\babubra\TestProjects\Test1\backend

# Активация venv
.\venv\Scripts\activate

# Установка зависимостей (если первый запуск)
pip install -r requirements.txt

# Создание .env (если первый запуск)
copy .env.example .env

# Создание таблиц и наполнение данными (если первый запуск)
python -m app.seed

# Запуск сервера
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000
Swagger: http://localhost:8000/docs

---

## 3. Запуск Frontend (Next.js)

```bash
cd c:\Users\babubra\TestProjects\Test1\kaliningrad-land

# Установка зависимостей (если первый запуск)
npm install

# Запуск dev-сервера
npm run dev
```

Сайт: http://localhost:3000

---

## Быстрый старт (все команды)

**Терминал 1 (DB):**
```bash
cd c:\Users\babubra\TestProjects\Test1
docker compose up -d db
```

**Терминал 2 (Backend):**
```bash
cd c:\Users\babubra\TestProjects\Test1\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

**Терминал 3 (Frontend):**
```bash
cd c:\Users\babubra\TestProjects\Test1\kaliningrad-land
npm run dev
```

---

## Полезные команды

```bash
# Пересоздать таблицы и данные
cd c:\Users\babubra\TestProjects\Test1\backend
.\venv\Scripts\activate
python -c "from app.database import engine, Base; from app.models import *; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)"
python -m app.seed

# Git коммит
cd c:\Users\babubra\TestProjects\Test1
git add .
git commit -m "описание изменений"
git push
```

---

## Технологии

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL + PostGIS
- **Infrastructure:** Docker Compose

---

## GitHub

https://github.com/babubra/landpapa
