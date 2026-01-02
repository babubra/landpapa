"""
Утилиты для работы со slug.
Транслитерация русского текста в URL-friendly формат.
"""

import re
from unidecode import unidecode


def generate_slug(title: str, id: int | None = None) -> str:
    """
    Генерирует slug из заголовка.
    
    Если передан id - добавляет его в конец для уникальности.
    
    Примеры:
    - "Земельный участок в Гурьевске" -> "zemelny-uchastok-v-guryevske"
    - "Земельный участок в Гурьевске", id=42 -> "zemelny-uchastok-v-guryevske-42"
    """
    # Транслитерация кириллицы в латиницу
    slug = unidecode(title)
    
    # Приводим к нижнему регистру
    slug = slug.lower()
    
    # Заменяем всё кроме букв и цифр на дефисы
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    
    # Убираем дефисы в начале и конце
    slug = slug.strip('-')
    
    # Убираем множественные дефисы
    slug = re.sub(r'-+', '-', slug)
    
    # Добавляем ID если передан
    if id is not None:
        slug = f"{slug}-{id}"
    
    return slug
