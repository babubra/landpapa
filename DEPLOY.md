# Руководство по деплою (Docker Compose)

Этот проект настроен для быстрого развертывания с использованием Docker Compose.

## Требования к серверу
- **ОС**: Ubuntu 22.04 / Debian 11+
- **Docker**: v24+
- **Docker Compose**: v2.20+
- **Ресурсы**: Мин. 4GB RAM, 2 vCPU.

## 1. Копирование проекта
Склонируйте репозиторий на сервер:
```bash
git clone https://github.com/your-username/landpapa.git
cd landpapa
```

## 2. Настройка переменных окружения
Создайте файл `.env`. Можно использовать `.env.example` как основу:
```bash
cp .env.example .env
nano .env
```

Отредактируйте `.env`, задав реальные домены (по умолчанию `landpapa.ru`):
```env
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=kaliningrad_land

# Backend
# Секретный ключ для JWT токенов (сгенерируйте новый!)
SECRET_KEY=your-super-super-secret-key-change-it

# Настройки доменов
NEXT_PUBLIC_API_URL=https://landpapa.ru/api
NEXT_PUBLIC_SITE_URL=https://landpapa.ru
```

## 3. Запуск
Используйте специальный файл `docker-compose.prod.yml` для продакшена:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
> Флаг `--build` обязателен при первом запуске или обновлении кода, чтобы запечь ENV переменные во фронтенд.

## 4. Инициализация базы данных
Если это первый запуск, нужно наполнить базу начальными данными:

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.seed
```

## 5. Обновление (CI/CD)
Чтобы обновить проект новой версией кода:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml image prune -f  # удалить старые образы
```

## Структура контейнеров
- **db**: PostgreSQL + PostGIS (порт 5432 закрыт снаружи)
- **backend**: FastAPI (внутренний порт 8000, доступен через Nginx /api)
- **frontend**: Next.js (внутренний порт 3000, доступен через Nginx /)
- **admin**: Next.js (внутренний порт 3000, доступен через Nginx admin.*)
- **nginx**: Reverse Proxy (порт 80/443, входная точка)

## SSL (HTTPS)
Для настройки SSL рекомендуется использовать Certbot.
1. Установите certbot на хост-машину (или добавьте контейнер certbot).
2. Отредактируйте `nginx/nginx.conf`, раскомментировав SSL настройки.
3. Пробросьте папку сертификатов `/etc/letsencrypt` в контейнер nginx.
