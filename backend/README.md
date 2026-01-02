# КалининградЗем Backend

FastAPI бэкенд для сайта продажи земельных участков.

## Установка

```bash
cd backend

# Создаём виртуальное окружение
python -m venv venv

# Активируем (Windows)
.\venv\Scripts\activate

# Активируем (Linux/Mac)
source venv/bin/activate

# Устанавливаем зависимости
pip install -r requirements.txt
```

## Настройка

1. Скопируйте `.env.example` в `.env`
2. Настройте подключение к PostgreSQL

```bash
cp .env.example .env
```

## Запуск

```bash
# Для разработки (с подробным логированием)
uvicorn app.main:app --reload --port 8001 --log-level debug
```

API будет доступен по адресу: http://localhost:8001

Документация:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Структура

```
backend/
├── app/
│   ├── main.py         # Точка входа FastAPI
│   ├── config.py       # Настройки
│   ├── database.py     # Подключение к БД
│   ├── models/         # SQLAlchemy модели
│   ├── schemas/        # Pydantic схемы
│   └── routers/        # API эндпоинты
├── requirements.txt
└── .env.example
```

## API Эндпоинты

### Новости
- `GET /api/news` — список новостей (пагинация)
- `GET /api/news/latest?limit=6` — последние N новостей
- `GET /api/news/{slug}` — новость по slug
- `POST /api/news` — создать новость
- `PUT /api/news/{id}` — обновить новость
- `DELETE /api/news/{id}` — удалить новость
