
"""
Скрипт диагностики подключения к NSPD (nspd.gov.ru).

Назначение:
Проверяет доступность сервиса NSPD с использованием текущих настроек (прокси, таймаут) из базы данных.
Полностью имитирует логику работы основного бэкенда.

Использование:
1. Запустите скрипт из папки backend:
   .\\venv\\Scripts\\python.exe debug_nspd_final.py

2. Интерпретация результатов:
   - [SUCCESS]: Прокси работает, данные получены.
   - [FAILURE] NSPD returned None: Соединение есть, но объект не найден или заблокирован (возможно 403 Forbidden).
   - [EXCEPTION]: Ошибка сети или прокси (см. текст ошибки, например ConnectError).

Если скрипт работает успешно, но админка не работает - проблема скорее всего в коде API админки, а не в сети.
"""

import asyncio
import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models.plot import Plot
from app.models.setting import Setting
from app.nspd_client import NspdClient
from sqlalchemy import select

async def main():
    print("--- STARTING FINAL PROXY VERIFICATION ---")
    
    async with AsyncSessionLocal() as db:
        print("Connected to DB.")
        
        # 1. Check DB Proxy Setting
        result = await db.execute(select(Setting).where(Setting.key == "nspd_proxy"))
        proxy_setting = result.scalar_one_or_none()
        
        if proxy_setting and proxy_setting.value:
            print(f"DB PROXY SETTING: Found (Starts with {proxy_setting.value[:5]}...)")
            # We rely on NspdClient to read this from DB via dependency usually, but here we manually pass it 
            # OR we can assume NspdClient would use it if we used the dependency. 
            # For this test, let's use the VALUE from DB to initialize client manually.
            proxy_val = proxy_setting.value
        else:
            print("DB PROXY SETTING: NOT FOUND! (Test might fail if direct access is blocked)")
            proxy_val = None

        # 2. Fetch Plot
        plot_id = 387
        print(f"Fetching Plot ID: {plot_id}")
        result = await db.execute(select(Plot).where(Plot.id == plot_id))
        plot = result.scalar_one_or_none()
        
        if not plot or not plot.cadastral_number:
            print("Plot 387 not found or no cadastral number.")
            return

        print(f"Target: {plot.cadastral_number}")

        # 3. Initialize Client with DB proxy
        print(f"Initializing NspdClient with proxy='{proxy_val}'...")
        client = NspdClient(proxy=proxy_val)
        
        try:
            print(f"Requesting info for '{plot.cadastral_number}'...")
            data = await client.get_object_info(plot.cadastral_number)
            
            if data:
                print("\n[SUCCESS] Data received from NSPD!")
                print(f"Address: {data.address}")
                print(f"Geometry: {data.geometry_type}")
                if data.coordinates_wgs84:
                    print(f"Coordinates: Found {len(data.coordinates_wgs84)} rings/points")
                else:
                    print("Coordinates: None")
            else:
                print("\n[FAILURE] NSPD returned None.")
                
        except Exception as e:
            print(f"\n[EXCEPTION] {e}")
            import traceback
            traceback.print_exc()
        finally:
            await client.close()
            print("Client closed.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
