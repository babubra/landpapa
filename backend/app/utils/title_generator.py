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


def generate_seo_title(listing) -> str:
    """
    Генерирует SEO-заголовок по формату:
    Участок {Площадь} — {Локация}, {Цена} | РКК земля
    
    Примеры:
    - "Участок 10 сот. — п. Лунино, 399 000 ₽ | РКК земля"
    - "Участок 6.5 сот. — г. Гурьевск, 1.2 млн ₽ | РКК земля"
    """
    # 1. Площадь (Area)
    area_part = "?"
    if listing.total_area and listing.total_area > 0:
         area_sotki = listing.total_area / 100
         # Используем сокращение "сот." для краткости в Title
         if area_sotki == int(area_sotki):
             area_part = f"{int(area_sotki)} сот."
         else:
             area_part = f"{area_sotki:.1f} сот.".replace(".0 сот.", " сот.")

    # 2. Локация (Location)
    location_part = ""
    # Пытаемся взять из settlement (если подгружено)
    if hasattr(listing, 'settlement') and listing.settlement:
        settlement = listing.settlement
        settlement_name = settlement.name or ""
        
        # Формируем префикс типа нас. пункта (г., п., снт.)
        type_prefix = ""
        # Тут можно добавить логику сокращений, если в базе полные названия
        # Пока берем просто имя, если типа нет.
        # Если type_short есть в модели Settlement, лучше использовать его.
        
        # Эвристика: если есть district и settlement, берем settlement
        # Обрезаем слишком длинные названия
        if len(settlement_name) > 30:
             settlement_name = settlement_name[:27] + "..."
             
        # Проверяем наличие 'type_short' (если добавим в модель) или хардкодим префиксы
        # Для простоты: п. {Name}
        location_part = f"п. {settlement_name}"
        if settlement.city: # Если это город
             location_part = f"г. {settlement_name}"
             
    elif hasattr(listing, 'settlement_id') and listing.settlement_id:
         # Fallback если объект settlement не подгружен, но есть ID (редкий кейс для листинга)
         location_part = "Калининградская обл."
    else:
         location_part = "Калининградская обл."


    # 3. Цена (Price)
    price_part = ""
    price = getattr(listing, 'price_public', None)
    # Если в листинге нет цены, попробуем найти минимальную цену среди участков
    if price is None or price == 0:
        if hasattr(listing, 'plots') and listing.plots:
             active_prices = [p.price_public for p in listing.plots if p.status == 'active' and p.price_public]
             if active_prices:
                 price = min(active_prices)
                 
    if price and price > 0:
        price_text = format_price_compact(price)
        price_part = f", {price_text}"
        
    # Сборка
    # Участок {area_part} — {location_part}, Калининградская обл.{price_part} | РКК земля
    seo_title = f"Участок {area_part} — {location_part}, Калининградская обл.{price_part} | РКК земля"
    
    return seo_title


def format_price_compact(price: float) -> str:
    """
    Форматирует цену компактно:
    - 399000 -> 399 000 ₽
    - 1200000 -> 1.2 млн ₽
    - 1150000 -> 1.15 млн ₽
    - 10000000 -> 10 млн ₽
    """
    if price >= 1_000_000:
        val = price / 1_000_000
        # Округляем до 2 знаков, убираем лишние нули
        val_str = f"{val:.2f}"
        if val_str.endswith(".00"):
            val_str = val_str[:-3]
        elif val_str.endswith("0"):
            val_str = val_str[:-1]
        return f"{val_str} млн ₽"
    elif price >= 1000:
        # Разделитель тысяч
        return f"{int(price):,} ₽".replace(",", " ")
    else:
        return f"{int(price)} ₽"
