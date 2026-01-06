#!/bin/bash

# Функция для вывода сообщений
log() {
    echo -e "\033[0;32m[LandPapa Deploy]\033[0m $1"
}

# Остановка при ошибке
set -e

# Проверка, нужен ли sudo
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
fi

log "Начинаем установку..."

# 1. Проверка и установка Docker
if ! command -v docker &> /dev/null; then
    log "Docker не найден. Устанавливаю..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO sh get-docker.sh
    rm get-docker.sh
    
    # Добавляем текущего пользователя в группу docker
    $SUDO usermod -aG docker $USER
    log "Docker установлен."
else
    log "Docker уже установлен."
fi

# 2. Создание папки проекта
PROJECT_DIR="landpapa"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 3. Клонирование / Обновление репозитория
if [ ! -d ".git" ]; then
    log "Репозиторий не найден. Клонируем..."
    echo "Введите HTTPS URL вашего репозитория (например https://github.com/username/repo.git):"
    read REPO_URL
    
    # Клонируем в текущую папку
    git clone $REPO_URL .
else
    log "Обновляем код..."
    git pull origin main
fi

# 4. Настройка переменных окружения
if [ ! -f .env ]; then
    log "Настройка .env..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        log "ВНИМАНИЕ: .env.example не найден. Создаем пустой .env"
        touch .env
    fi
    
    log "Сейчас откроется редактор nano для настройки .env."
    log "1. Укажите домены (NEXT_PUBLIC_SITE_URL)"
    log "2. Задайте сложные пароли"
    log "3. Нажмите Ctrl+X, затем Y, затем Enter для сохранения."
    echo "Нажмите Enter чтобы открыть редактор..."
    read
    nano .env
else
    log "Файл .env уже существует. Хотите отредактировать? (y/n)"
    read EDIT_ENV
    if [ "$EDIT_ENV" = "y" ]; then
        nano .env
    fi
fi

# 5. Запуск
log "Запускаем проект..."
$SUDO docker compose -f docker-compose.prod.yml up -d --build

# 6. Инициализация БД (опционально)
log "Хотите запустить seed (начальные данные)? Введите 'y' если это первый запуск:"
read RUN_SEED
if [ "$RUN_SEED" = "y" ]; then
    log "Заполняем базу данными..."
    $SUDO docker compose -f docker-compose.prod.yml exec backend python -m app.seed
fi

log "Готово! 🚀"
log "Сайт доступен. Проверьте: docker compose -f docker-compose.prod.yml ps"
