"""
Утилита для генерации названий объявлений.
"""

from app.models.plot import Plot


def generate_listing_title(plots: list[Plot], settlement=None) -> str:
    """
    Генерирует название объявления на основе участков и местоположения.
    
    Примеры:
    - 1 участок 6 соток: "Продажа участка 6 соток"
    - С местоположением: "Продажа участков от 6 соток Гурьевский район, пос. Авангардное"
    """
    if not plots:
        return "Продажа участка"
    
    # Фильтруем только активные участки
    active_plots = [p for p in plots if p.status == "active"]
    if not active_plots:
        active_plots = plots  # Если нет активных, используем все
    
    plots_count = len(active_plots)
    
    # Минимальная площадь в сотках (1 сотка = 100 м²)
    areas = [p.area for p in active_plots if p.area]
    if areas:
        min_area_sotki = min(areas) / 100
        area_text = format_sotki(min_area_sotki)
    else:
        area_text = None
    
    # Собираем уникальные виды разрешённого использования
    land_uses = set()
    for p in active_plots:
        if p.land_use and p.land_use.name:
            land_uses.add(p.land_use.name)
    
    # Формируем название
    if plots_count == 1:
        title = "Продажа участка"
    else:
        title = "Продажа участков"
    
    if area_text:
        if plots_count == 1:
            title += f" {area_text}"
        else:
            title += f" от {area_text}"
    
    if land_uses:
        land_uses_str = ", ".join(sorted(land_uses))
        title += f" ({land_uses_str})"
    
    # Добавляем местоположение
    if settlement:
        location_parts = []
        if hasattr(settlement, 'district') and settlement.district:
            location_parts.append(settlement.district.name)
        if hasattr(settlement, 'name') and settlement.name:
            location_parts.append(settlement.name)
        
        if location_parts:
            location_str = ", ".join(location_parts)
            title += f" {location_str}"
    
    return title


def format_sotki(sotki: float) -> str:
    """
    Форматирует площадь в сотках.
    
    Примеры:
    - 6.0 -> "6 соток"
    - 6.5 -> "6.5 соток"
    - 1.0 -> "1 сотка"
    - 2.0 -> "2 сотки"
    """
    # Округляем до 1 знака
    if sotki == int(sotki):
        sotki_int = int(sotki)
        sotki_str = str(sotki_int)
    else:
        sotki_str = f"{sotki:.1f}"
        if sotki_str.endswith('.0'):
            sotki_str = sotki_str[:-2]
    
    # Склонение слова "сотка"
    sotki_word = get_sotki_word(sotki)
    
    return f"{sotki_str} {sotki_word}"


def get_sotki_word(sotki: float) -> str:
    """
    Возвращает правильное склонение слова "сотка".
    
    1 -> сотка
    2, 3, 4 -> сотки
    5-20 -> соток
    21 -> сотка
    и т.д.
    """
    sotki_int = int(sotki)
    
    if 11 <= sotki_int % 100 <= 19:
        return "соток"
    
    last_digit = sotki_int % 10
    
    if last_digit == 1:
        return "сотка"
    elif 2 <= last_digit <= 4:
        return "сотки"
    else:
        return "соток"
