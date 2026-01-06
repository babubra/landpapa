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

### Настройки сайта

Публичные настройки доступны без авторизации через `GET /api/settings/public`.

| Ключ | Описание | Пример |
|------|----------|--------|
| `site_title` | Название сайта | КалининградЗем |
| `site_subtitle` | Подзаголовок | Земельные участки |
| `site_phone` | Телефон в шапке | +7 (4012) 12-34-56 |
| `hero_title` | Заголовок Hero-секции | Земельные участки в... |
| `hero_subtitle` | Подзаголовок Hero | Найдите идеальный участок... |
| `hero_image` | URL фонового изображения Hero | /uploads/hero.jpg |
| `placeholder_image` | URL изображения-заглушки | /uploads/placeholder.jpg |

Управление настройками доступно в админке: `/settings`

## Массовый импорт участков

Для массового импорта участков используется API endpoint `POST /api/admin/plots/bulk-import`.

### Формат JSON файла

```json
[
  {
    "cadastral_number": "39:03:090201:571",
    "price": 1300000,
    "comment": "собственность"
  },
  {
    "cadastral_number": "39:03:091001:1139",
    "price": 2300000,
    "comment": "собственность; продаются вместе; Продаётся вместе с 39:03:091001:861"
  }
]
```

### Поля

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `cadastral_number` | string | **обязательное** | Кадастровый номер участка (формат: NN:NN:NNNNNN:NNN) |
| `price` | integer | опционально | Цена участка в рублях |
| `comment` | string | опционально | Комментарий (собственность/аренда, продаётся вместе и т.д.) |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["cadastral_number"],
    "properties": {
      "cadastral_number": {
        "type": "string",
        "description": "Кадастровый номер участка",
        "pattern": "^\\d{2}:\\d{2}:\\d{6,7}:\\d+$"
      },
      "price": {
        "type": "integer",
        "minimum": 0,
        "description": "Цена участка в рублях"
      },
      "comment": {
        "type": "string",
        "description": "Комментарий"
      }
    }
  }
}
```

### Поведение при импорте

1. **Создание/обновление**: Если участок с указанным кадастровым номером уже существует — он будет обновлён, иначе создан новый
2. **Обогащение из NSPD**: Для каждого участка последовательно запрашиваются данные из NSPD (полигон, центроид, площадь, адрес)
3. **Результат**: API возвращает детальный отчёт по каждому участку со статусом импорта и результатом запроса NSPD

