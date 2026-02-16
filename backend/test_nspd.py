"""
Скрипт для тестирования доступности NSPD и экспериментов с HTTP заголовками.

Использование:
    python test_nspd.py                           # Тест с дефолтными заголовками (httpx)
    python test_nspd.py --cn 39:01:010101:123     # Указать кадастровый номер
    python test_nspd.py --proxy http://1.2.3.4:8080  # Через прокси
    python test_nspd.py --timeout 15              # Увеличить таймаут
    python test_nspd.py --use-curl                # Использовать curl_cffi (обход TLS fingerprint)

Если httpx даёт 403 а --use-curl работает — проблема в TLS fingerprint.
Для установки curl_cffi:  pip install curl_cffi
"""

import argparse
import asyncio
import json
import sys
import time

import httpx
from pyproj import CRS, Transformer
from urllib.parse import urlencode


# ╔══════════════════════════════════════════════════════════════════════╗
# ║                                                                      ║
# ║   📌  ЗАГОЛОВКИ — РЕДАКТИРУЙ ЗДЕСЬ                                  ║
# ║                                                                      ║
# ║   Это основной блок для экспериментов.                                ║
# ║   Меняй значения, добавляй или убирай заголовки.                     ║
# ║   После изменений просто перезапусти скрипт.                         ║
# ║                                                                      ║
# ║   Текущие значения — ТОЧНАЯ КОПИЯ из работающего                      ║
# ║   браузерного запроса (Chrome 145, macOS).                            ║
# ║                                                                      ║
# ╚══════════════════════════════════════════════════════════════════════╝

HEADERS = {
    # --------------- Основные ---------------
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Accept": "*/*",
    # Accept-Encoding НЕ указываем вручную — httpx/curl_cffi сами управляют
    # сжатием и автоматически декомпрессируют ответ (gzip/br/zstd).
    # Если указать вручную, httpx вернёт сырые сжатые байты без декомпрессии.
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",

    # --------------- Referer и Origin ---------------
    "Referer": "https://nspd.gov.ru/map?thematic=PKK&zoom=5&coordinate_x=7804891.637510094&coordinate_y=8181287.398947453&theme_id=1&baseLayerId=235&is_copy_url=true",
    "Origin": "https://nspd.gov.ru",

    # --------------- Sec-* заголовки (Chrome 145 / macOS) ---------------
    "Sec-Ch-Ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",

    # --------------- Дополнительные ---------------
    "Priority": "u=1, i",

    # --------------- Эксперименты ---------------
    # Раскомментируй или добавляй:
    #
    # "DNT": "1",
    # "Cookie": "_ym_uid=177126663381480154; _ym_d=1771266633; _ym_isad=2; _ym_visorc=b",
    # "Connection": "keep-alive",
    # "X-Requested-With": "XMLHttpRequest",
    # "Cache-Control": "no-cache",
}


# ══════════════════════════════════════════════════════════════════════
#  Дальше — логика скрипта, менять не нужно (если только не хочешь)
# ══════════════════════════════════════════════════════════════════════

BASE_URL = "https://nspd.gov.ru"
SEARCH_PATH = "/api/geoportal/v2/search/geoportal"
DEFAULT_CN = "39:05:060508:296"  # Кадастровый номер для тестового запроса

# Трансформер координат
CRS_WEB_MERCATOR = CRS.from_epsg(3857)
CRS_WGS84 = CRS.from_epsg(4326)
transformer = Transformer.from_crs(CRS_WEB_MERCATOR, CRS_WGS84, always_xy=True)


def transform_polygon(polygon_coords: list) -> list:
    return [
        [list(transformer.transform(x, y)) for x, y in ring]
        for ring in polygon_coords
    ]


def transform_point(point_coords: list) -> list:
    return list(transformer.transform(point_coords[0], point_coords[1]))


def print_section(title: str):
    width = 60
    print(f"\n{'='*width}")
    print(f"  {title}")
    print(f"{'='*width}")


def print_kv(key: str, value, indent: int = 2):
    prefix = " " * indent
    print(f"{prefix}{key}: {value}")


async def test_nspd(cadastral_number: str, proxy: str | None, timeout: float, verify_ssl: bool):
    """Тестирование через httpx."""

    print_section("⚙️  КОНФИГУРАЦИЯ")
    print_kv("HTTP-клиент", "httpx")
    print_kv("Кадастровый номер", cadastral_number)
    print_kv("Прокси", proxy or "нет")
    print_kv("Таймаут", f"{timeout}с")
    print_kv("SSL-верификация", "да" if verify_ssl else "нет")

    print_section("📋 ЗАГОЛОВКИ (отправляемые)")
    for k, v in HEADERS.items():
        print_kv(k, v, indent=4)

    # Подготовка прокси
    proxy_url = None
    if proxy:
        if proxy.startswith("http://") or proxy.startswith("https://"):
            proxy_url = proxy
        else:
            proxy_url = f"http://{proxy}"

    params = {"thematicSearchId": 1, "query": cadastral_number}
    full_url = f"{BASE_URL}{SEARCH_PATH}?{urlencode(params)}"

    print_section("🌐 ЗАПРОС")
    print_kv("URL", full_url)

    async with httpx.AsyncClient(
        headers=HEADERS,
        timeout=timeout,
        verify=verify_ssl,
        proxy=proxy_url,
    ) as client:
        start_time = time.monotonic()
        try:
            response = await client.get(full_url)
            elapsed = time.monotonic() - start_time
            _print_response(response.status_code, elapsed,
                            dict(response.headers), response.text)
        except httpx.TimeoutException:
            elapsed = time.monotonic() - start_time
            print_section("❌ ТАЙМАУТ")
            print(f"  Сервер не ответил за {elapsed:.2f}с (лимит: {timeout}с)")
            print("  Попробуй увеличить таймаут: --timeout 20")
        except httpx.ConnectError as e:
            print_section("❌ ОШИБКА ПОДКЛЮЧЕНИЯ")
            print(f"  {e}")
        except Exception as e:
            print_section(f"❌ НЕОЖИДАННАЯ ОШИБКА: {type(e).__name__}")
            print(f"  {e}")
            import traceback
            traceback.print_exc()


def test_nspd_curl(cadastral_number: str, proxy: str | None, timeout: float):
    """
    Тестирование через curl_cffi — эмулирует TLS fingerprint реального Chrome.
    Установка: pip install curl_cffi
    """
    try:
        from curl_cffi import requests as curl_requests
    except ImportError:
        print_section("❌ curl_cffi не установлен")
        print("  Установи:  pip install curl_cffi")
        print("  Потом:     python test_nspd.py --use-curl")
        return

    print_section("⚙️  КОНФИГУРАЦИЯ")
    print_kv("HTTP-клиент", "curl_cffi (эмуляция Chrome TLS)")
    print_kv("Кадастровый номер", cadastral_number)
    print_kv("Прокси", proxy or "нет")
    print_kv("Таймаут", f"{timeout}с")

    print_section("📋 ЗАГОЛОВКИ (отправляемые)")
    for k, v in HEADERS.items():
        print_kv(k, v, indent=4)

    params = {"thematicSearchId": 1, "query": cadastral_number}
    full_url = f"{BASE_URL}{SEARCH_PATH}?{urlencode(params)}"

    print_section("🌐 ЗАПРОС")
    print_kv("URL", full_url)

    proxies = None
    if proxy:
        p = proxy if proxy.startswith("http") else f"http://{proxy}"
        proxies = {"http": p, "https": p}

    start_time = time.monotonic()
    try:
        response = curl_requests.get(
            full_url,
            headers=HEADERS,
            impersonate="chrome",  # ← ключевой параметр: эмулирует TLS Chrome
            timeout=timeout,
            verify=False,
            proxies=proxies,
        )
        elapsed = time.monotonic() - start_time
        _print_response(response.status_code, elapsed,
                        dict(response.headers), response.text)
    except Exception as e:
        print_section(f"❌ ОШИБКА: {type(e).__name__}")
        print(f"  {e}")


def _print_response(status_code: int, elapsed: float,
                    headers: dict, body: str):
    """Общий вывод ответа для обоих клиентов."""

    print_section("📨 ОТВЕТ")
    print_kv("Статус", status_code)
    print_kv("Время ответа", f"{elapsed:.2f}с")
    print_kv("Content-Type", headers.get("content-type", "н/д"))

    print("\n  Заголовки ответа (сервер):")
    for k, v in headers.items():
        print_kv(k, v, indent=6)

    if status_code != 200:
        print_section("❌ ОШИБКА")
        print(f"  HTTP {status_code}")
        print(f"  Тело ответа (первые 1000 символов):\n{body[:1000]}")
        return

    try:
        data = json.loads(body)
    except Exception as e:
        print_section("❌ ОШИБКА ПАРСИНГА JSON")
        print(f"  {e}")
        print(f"  Тело (первые 500 символов): {body[:500]}")
        return

    print_section("📦 ДАННЫЕ")

    features = data.get("data", {}).get("features", [])
    print_kv("Количество features", len(features))

    if not features:
        print("\n  ⚠️  Объект НЕ найден в ответе.")
        print(f"\n  Сырой ответ (первые 500 символов):\n  {json.dumps(data, ensure_ascii=False)[:500]}")
        return

    feature = features[0]
    props = feature.get("properties", {})
    options = props.get("options", {})
    geometry = feature.get("geometry")

    print_kv("categoryName", props.get("categoryName"))
    print_kv("cad_num", options.get("cad_num") or options.get("cad_number"))
    print_kv("address", options.get("readable_address") or options.get("address_readable_address"))
    print_kv("area", options.get("specified_area") or options.get("land_record_area") or options.get("area"))

    if geometry:
        geom_type = geometry.get("type")
        coords = geometry.get("coordinates")
        print_kv("Тип геометрии", geom_type)
        print_kv("Координаты (сырые)", "есть" if coords else "нет")

        if coords:
            print_section("🗺️  КООРДИНАТЫ (WGS 84)")
            try:
                if geom_type == "Polygon":
                    wgs = transform_polygon(coords)
                    print(f"  Полигон — {len(wgs[0])} точек")
                    for i, pt in enumerate(wgs[0][:3]):
                        print(f"    [{i}] lon={pt[0]:.6f}, lat={pt[1]:.6f}")
                    if len(wgs[0]) > 3:
                        print(f"    ... и ещё {len(wgs[0]) - 3} точек")
                    outer = wgs[0]
                    n = len(outer) - 1
                    if n > 0:
                        clon = sum(p[0] for p in outer[:-1]) / n
                        clat = sum(p[1] for p in outer[:-1]) / n
                        print(f"  Центроид: lon={clon:.6f}, lat={clat:.6f}")
                elif geom_type == "Point":
                    wgs = transform_point(coords)
                    print(f"  Точка: lon={wgs[0]:.6f}, lat={wgs[1]:.6f}")
                else:
                    print(f"  Неизвестный тип геометрии: {geom_type}")
            except Exception as e:
                print(f"  ❌ Ошибка трансформации координат: {e}")
        else:
            print("\n  ⚠️  Координаты отсутствуют в ответе!")
    else:
        print("\n  ⚠️  Геометрия полностью отсутствует!")

    print_section("✅ ТЕСТ ЗАВЕРШЁН УСПЕШНО")


def main():
    parser = argparse.ArgumentParser(
        description="Тестирование доступности NSPD (nspd.gov.ru)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python test_nspd.py                         # httpx (стандарт)
  python test_nspd.py --use-curl              # curl_cffi (обход TLS fingerprint)
  python test_nspd.py --cn 39:01:010101:123
  python test_nspd.py --proxy http://1.2.3.4:8080
  python test_nspd.py --timeout 20

Стратегия диагностики:
  1. Запусти без флагов (httpx). Если 403 → 
  2. Запусти с --use-curl. Если 200 →
     Проблема в TLS fingerprint, нужно мигрировать на curl_cffi.
  3. Если оба 403 → проблема в IP/заголовках, экспериментируй с HEADERS.
        """,
    )
    parser.add_argument("--cn", default=DEFAULT_CN, help=f"Кадастровый номер (по умолчанию: {DEFAULT_CN})")
    parser.add_argument("--proxy", default=None, help="HTTP прокси (например http://1.2.3.4:8080)")
    parser.add_argument("--timeout", type=float, default=10.0, help="Таймаут в секундах (по умолчанию: 10)")
    parser.add_argument("--use-curl", action="store_true", help="Использовать curl_cffi вместо httpx (обход TLS fingerprint)")

    args = parser.parse_args()

    if args.use_curl:
        test_nspd_curl(args.cn, args.proxy, args.timeout)
    else:
        asyncio.run(test_nspd(args.cn, args.proxy, args.timeout, verify_ssl=False))


if __name__ == "__main__":
    main()

