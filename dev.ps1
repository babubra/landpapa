# Скрипт для запуска всех сервисов разработки одной командой
# Использование: .\dev.ps1

Write-Host "🚀 Запуск среды разработки LandPapa..." -ForegroundColor Green

# Запуск Docker (база данных)
Write-Host "📦 Запуск базы данных..." -ForegroundColor Cyan
docker-compose up -d

# Небольшая пауза для запуска БД
Start-Sleep -Seconds 2

# Запуск Backend в новом окне терминала
Write-Host "🔧 Запуск Backend (порт 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\uvicorn app.main:app --reload --port 8001"

# Запуск Frontend в новом окне терминала
Write-Host "🌐 Запуск Frontend (порт 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\kaliningrad-land'; npm run dev"

# Запуск Admin в новом окне терминала
Write-Host "⚙️ Запуск Admin (порт 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\admin'; npx next dev -p 3001"

Write-Host ""
Write-Host "✅ Все сервисы запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Ссылки:" -ForegroundColor Yellow
Write-Host "   API:     http://localhost:8001"
Write-Host "   Сайт:    http://localhost:3000"
Write-Host "   Админка: http://localhost:3001"
Write-Host ""
Write-Host "Для остановки закройте все открытые терминалы и выполните: docker-compose down" -ForegroundColor Gray
