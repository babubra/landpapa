import os
import aiohttp
from typing import List, Optional
from pydantic import BaseModel

class DaDataSuggestion(BaseModel):
    value: str
    unrestricted_value: str
    data: dict


def _get_dadata_api_key_from_db() -> Optional[str]:
    """Получить API ключ DaData из базы данных."""
    try:
        from app.database import SessionLocal
        from app.models.setting import Setting
        
        db = SessionLocal()
        try:
            setting = db.query(Setting).filter(Setting.key == "dadata_api_key").first()
            return setting.value if setting and setting.value else None
        finally:
            db.close()
    except Exception as e:
        print(f"Warning: Failed to load dadata_api_key from DB: {e}")
        return None


class DaDataClient:
    BASE_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs"

    def __init__(self):
        self.api_key = _get_dadata_api_key_from_db()

    async def suggest_settlement(self, query: str, count: int = 10) -> List[DaDataSuggestion]:
        """
        Поиск населенных пунктов (исключая улицы).
        Ограничиваем поиск Калининградской областью по умолчанию (kladr_id 39).
        """
        if not self.api_key:
            print("Warning: DADATA_API_KEY not found in settings")
            return []

        url = f"{self.BASE_URL}/suggest/address"
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        # Фильтр по Калининградской области (region_fias_id или kladr_id)
        # 39 - код региона
        payload = {
            "query": query,
            "count": count,
            "from_bound": {"value": "city"},
            "to_bound": {"value": "settlement"},
            "locations": [{"kladr_id": "39"}], # Калининградская область (КЛАДР)
            "restrict_value": True 
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return [DaDataSuggestion(**item) for item in data.get("suggestions", [])]
                    else:
                        print(f"DaData error: {response.status} {await response.text()}")
                        return []
            except Exception as e:
                print(f"DaData exception: {e}")
                return []

_dadata_client = None

def get_dadata_client() -> DaDataClient:
    global _dadata_client
    if not _dadata_client:
        _dadata_client = DaDataClient()
    return _dadata_client


def reset_dadata_client():
    """Сбросить клиент DaData (вызывать после изменения настроек)."""
    global _dadata_client
    _dadata_client = None

