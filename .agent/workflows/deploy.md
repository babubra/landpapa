---
description: Деплой изменений на продакшен сервер LandPapa
---

# Деплой на продакшен

## Предварительные условия
- Все изменения должны быть закоммичены и запушены в `main`
- Рабочая директория проекта: `/Users/fatau/TestProjects/lp2`

## Шаги

### 1. Проверить что нет незакоммиченных изменений
// turbo
```bash
cd /Users/fatau/TestProjects/lp2 && git status --short
```
Если есть незакоммиченные изменения — спросить пользователя, нужно ли их закоммитить или откатить.

### 2. Закоммитить изменения (если есть)
```bash
cd /Users/fatau/TestProjects/lp2 && git add -A && git commit -m "<описание изменений>"
```

### 3. Запушить в main
```bash
cd /Users/fatau/TestProjects/lp2 && git push origin main
```

### 4. Запустить деплой на сервере
```bash
ssh root@194.190.153.58 "cd ~/landpapa && ./deploy.sh"
```
Эта команда выполняет:
- `git pull origin main`
- `docker compose -f docker-compose.prod.yml up -d --build`
- `docker compose -f docker-compose.prod.yml restart nginx`
- `alembic upgrade head` (миграции БД)
- `python -m app.seed` (обновление настроек)
- `docker image prune -f` (очистка)

Сборка контейнеров занимает ~1-2 минуты. Используй `command_status` с `WaitDurationSeconds: 180` для ожидания.

### 5. Проверить результат
После завершения деплоя убедиться что в выводе есть:
- `✅ Деплой завершён!`
- Все контейнеры в статусе `Up`

Ссылки для проверки:
- Сайт: https://rkkland.ru
- Админка: https://admin.rkkland.ru
