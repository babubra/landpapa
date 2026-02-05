#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Запуск среды разработки LandPapa...${NC}"

# Функция для остановки всех процессов при выходе
cleanup() {
    echo ""
    echo -e "${YELLOW}Остановка всех сервисов...${NC}"
    # Убиваем все фоновые процессы этой группы
    kill $(jobs -p) 2>/dev/null
    echo -e "${GREEN}✅ Готово.${NC}"
    exit
}

trap cleanup SIGINT

# 1. Запуск базы данных
echo -e "${CYAN}📦 Запуск базы данных...${NC}"
docker compose up -d

# 2. Пауза для БД
sleep 2

# 3. Запуск Backend
echo -e "${CYAN}🔧 Запуск Backend (порт 8001)...${NC}"
cd backend
# Проверяем путь к uvicorn: macOS/Linux vs Windows
if [ -f "venv/bin/uvicorn" ]; then
    ./venv/bin/uvicorn app.main:app --reload --port 8001 &
elif [ -f "venv/Scripts/uvicorn" ]; then
    ./venv/Scripts/uvicorn app.main:app --reload --port 8001 &
else
    echo -e "${RED}❌ Ошибка: uvicorn не найден. Убедитесь, что venv создан внутри /backend${NC}"
fi
cd ..

# 4. Запуск Frontend
echo -e "${CYAN}🌐 Запуск Frontend (порт 3000)...${NC}"
cd kaliningrad-land
npm run dev &
cd ..

# 5. Запуск Admin
echo -e "${CYAN}⚙️ Запуск Admin (порт 3001)...${NC}"
cd admin
npx next dev -p 3001 &
cd ..

echo ""
echo -e "${GREEN}✅ Все сервисы запускаются!${NC}"
echo -e "${YELLOW}📍 API:     http://localhost:8001${NC}"
echo -e "${YELLOW}📍 Сайт:    http://localhost:3000${NC}"
echo -e "${YELLOW}📍 Админка: http://localhost:3001${NC}"
echo ""
echo "Логи будут выводиться ниже. Нажмите Ctrl+C для остановки."

# Ждем завершения фоновых процессов
wait
