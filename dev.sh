#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Запуск среды разработки LandPapa (Linux/WSL)...${NC}"

# Функция для остановки всех процессов при выходе
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    # Убиваем все фоновые процессы этой группы
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT

# 1. Запуск базы данных
echo -e "${CYAN}📦 Запуск базы данных...${NC}"
sudo docker compose up -d

# 2. Запуск Backend
echo -e "${CYAN}🔧 Запуск Backend (порт 8001)...${NC}"
cd backend
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaliningrad_land
# Используем прямой путь к uvicorn из venv
./venv/bin/uvicorn app.main:app --reload --port 8001 &
cd ..

# 3. Запуск Frontend
echo -e "${CYAN}🌐 Запуск Frontend (порт 3000)...${NC}"
cd kaliningrad-land
npm run dev &
cd ..

# 4. Запуск Admin
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
