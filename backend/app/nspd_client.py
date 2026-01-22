"""
Клиент для взаимодействия с геопорталом NSPD (nspd.gov.ru).

Получение координат земельных участков по кадастровому номеру.
"""

import asyncio
import enum
import logging
from datetime import datetime, timedelta
from typing import Any, Literal, Optional
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel, Field, field_validator
from pyproj import CRS, Transformer


logger = logging.getLogger(__name__)


# --- Конфигурация систем координат ---
CRS_WEB_MERCATOR = CRS.from_epsg(3857)
CRS_WGS84 = CRS.from_epsg(4326)


# --- Pydantic схемы ---

class CadastralObject(BaseModel):
    """Структурированная информация о кадастровом объекте."""

    cadastral_number: str = Field(description="Кадастровый номер")
    category_name: Optional[str] = Field(None, description="Категория объекта")
    address: Optional[str] = Field(None, description="Читаемый адрес объекта")
    area_sq_m: Optional[float] = Field(None, description="Площадь в квадратных метрах")
    extension_m: Optional[float] = Field(None, description="Протяженность в метрах")
    geometry_type: Optional[Literal["Point", "Polygon"]] = Field(None, description="Тип геометрии")
    coordinates_wgs84: Optional[Any] = Field(None, description="Координаты в WGS 84")
    centroid_wgs84: Optional[list[float]] = Field(None, description="Центр полигона [lon, lat]")
    related_cadastral_numbers: Optional[list[str]] = Field(None, description="Связанные объекты")
    original_geometry: Optional[dict[str, Any]] = Field(None, description="Исходная геометрия")

    @field_validator("area_sq_m", "extension_m", mode="before")
    def clean_float_fields(cls, v):
        if v is not None:
            return float(v)
        return v


# --- Circuit Breaker ---

class CircuitState(enum.Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class NspdClient:
    """
    Асинхронный клиент для взаимодействия с геопорталом nspd.gov.ru.
    
    Возвращает информацию о кадастровых объектах по их кадастровому номеру.
    """

    def __init__(
        self,
        timeout: float = 10.0,
        cooldown_minutes: int = 5,
        proxy: Optional[str] = None,
    ):
        self.base_url = "https://nspd.gov.ru"
        self._transformer = Transformer.from_crs(CRS_WEB_MERCATOR, CRS_WGS84, always_xy=True)

        proxy_url = None
        if proxy:
            if proxy.startswith("http://") or proxy.startswith("https://"):
                proxy_url = proxy
            else:
                proxy_url = f"http://{proxy}"
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://nspd.gov.ru/map?thematic=PKK&zoom=16&active_layers=36049",
                "Origin": "https://nspd.gov.ru",
                "Sec-Ch-Ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "DNT": "1",
                "Priority": "u=1, i",
            },
            timeout=timeout,
            verify=False,
            proxy=proxy_url,
        )

        # Circuit Breaker
        self._circuit_state = CircuitState.CLOSED
        self._cooldown_period = timedelta(minutes=cooldown_minutes)
        self._last_failure_time: datetime | None = None
        self._lock = asyncio.Lock()
        self._failure_count = 0
        self._failure_threshold = 2

    def _transform_polygon(self, polygon_coords: list) -> list:
        return [
            [list(self._transformer.transform(x, y)) for x, y in ring]
            for ring in polygon_coords
        ]

    def _transform_point(self, point_coords: list) -> list:
        return list(self._transformer.transform(point_coords[0], point_coords[1]))

    def _calculate_polygon_centroid(self, polygon_wgs84: list) -> list:
        outer_ring = polygon_wgs84[0]
        num_points = len(outer_ring) - 1
        if num_points < 1:
            return []
        sum_lon = sum(point[0] for point in outer_ring[:-1])
        sum_lat = sum(point[1] for point in outer_ring[:-1])
        return [sum_lon / num_points, sum_lat / num_points]

    async def get_object_info(
        self, cadastral_number: str
    ) -> Optional[CadastralObject]:
        """
        Получение информации об объекте по кадастровому номеру.
        """
        # Circuit Breaker check
        async with self._lock:
            if self._circuit_state == CircuitState.OPEN:
                if datetime.now() > self._last_failure_time + self._cooldown_period:
                    self._circuit_state = CircuitState.HALF_OPEN
                    logger.warning("NSPD: Circuit HALF-OPEN, trying request...")
                else:
                    logger.warning(f"NSPD: Circuit OPEN, failing fast for {cadastral_number}")
                    print(f"[NSPD DEBUG] Circuit OPEN, failing fast")
                    return None

        logger.info(f"NSPD: Querying cadastral number: {cadastral_number}")
        print(f"[NSPD DEBUG] Querying cadastral number: {cadastral_number}")
        
        params = {"thematicSearchId": 1, "query": cadastral_number}
        url = f"/api/geoportal/v2/search/geoportal?{urlencode(params)}"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()

            # Success
            await self._handle_success()

            if not data.get("data") or not data["data"].get("features"):
                logger.info(f"NSPD: Object {cadastral_number} not found")
                print(f"[NSPD DEBUG] Object NOT found in response: {data}")
                return None

            feature = data["data"]["features"][0]
            properties = feature.get("properties", {})
            options = properties.get("options", {})
            geometry = feature.get("geometry")

            cad_num = options.get("cad_num") or options.get("cad_number")
            address = options.get("readable_address") or options.get("address_readable_address")
            area = (
                options.get("specified_area")
                or options.get("build_record_area")
                or options.get("params_area")
                or options.get("land_record_area")
                or options.get("area")
            )

            result_data = {
                "cadastral_number": cad_num or cadastral_number,
                "category_name": properties.get("categoryName"),
                "address": address,
                "area_sq_m": area,
                "extension_m": options.get("params_extension"),
                "original_geometry": geometry,
            }

            if geometry and geometry.get("coordinates"):
                geom_type = geometry.get("type")
                result_data["geometry_type"] = geom_type
                
                if geom_type == "Polygon":
                    coords_wgs84 = self._transform_polygon(geometry["coordinates"])
                    result_data["coordinates_wgs84"] = coords_wgs84
                    result_data["centroid_wgs84"] = self._calculate_polygon_centroid(coords_wgs84)
                elif geom_type == "Point":
                    result_data["coordinates_wgs84"] = self._transform_point(geometry["coordinates"])

            logger.info(f"NSPD: Found object {cad_num}")
            return CadastralObject.model_validate(result_data)

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as e:
            logger.error(f"NSPD: Network error: {type(e).__name__}")
            print(f"[NSPD DEBUG] Network error: {type(e).__name__} - {e}")
            if isinstance(e, httpx.HTTPStatusError):
                print(f"[NSPD DEBUG] Response Status: {e.response.status_code}")
                # print(f"[NSPD DEBUG] Response Body: {e.response.text[:500]}") # Optional: might be HTML
            await self._handle_failure()
            return None
        except Exception as e:
            logger.error(f"NSPD: Unexpected error: {e}")
            print(f"[NSPD DEBUG] Unexpected error: {e}")
            return None

    async def _handle_success(self):
        async with self._lock:
            if self._circuit_state == CircuitState.HALF_OPEN:
                logger.info("NSPD: Success on HALF-OPEN, circuit CLOSED")
            self._failure_count = 0
            self._circuit_state = CircuitState.CLOSED

    async def _handle_failure(self):
        async with self._lock:
            if self._circuit_state == CircuitState.HALF_OPEN:
                self._circuit_state = CircuitState.OPEN
                self._last_failure_time = datetime.now()
                logger.error(f"NSPD: Failure on HALF-OPEN, circuit OPEN for {self._cooldown_period}")
            else:
                self._failure_count += 1
                if self._failure_count >= self._failure_threshold:
                    self._circuit_state = CircuitState.OPEN
                    self._last_failure_time = datetime.now()
                    logger.error(f"NSPD: Threshold reached, circuit OPEN for {self._cooldown_period}")

    async def close(self):
        if not self.client.is_closed:
            await self.client.aclose()


def _get_settings_from_db() -> tuple[Optional[str], float]:
    """Получить настройки NSPD из базы данных."""
    try:
        from app.database import SessionLocal
        from app.models.setting import Setting
        
        db = SessionLocal()
        try:
            proxy_setting = db.query(Setting).filter(Setting.key == "nspd_proxy").first()
            timeout_setting = db.query(Setting).filter(Setting.key == "nspd_timeout").first()
            
            proxy = proxy_setting.value if proxy_setting and proxy_setting.value else None
            timeout = float(timeout_setting.value) if timeout_setting and timeout_setting.value else 10.0
            
            return proxy, timeout
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"NSPD: Failed to load settings from DB: {e}")
        return None, 10.0


from typing import AsyncGenerator

async def get_nspd_client() -> AsyncGenerator[NspdClient, None]:
    """
    FastAPI dependency для получения экземпляра NspdClient.
    Создаёт новый экземпляр для каждого запроса (или scope),
    и корректно закрывает соединение после использования.
    """
    proxy, timeout = _get_settings_from_db()
    # logger.info(f"NSPD: Creating client with proxy={proxy}, timeout={timeout}")
    client = NspdClient(timeout=timeout, proxy=proxy)
    try:
        yield client
    finally:
        await client.close()

