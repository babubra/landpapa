"""Работа со временем."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    Текущее время UTC без таймзоны.

    Замена datetime.utcnow(), который объявлен устаревшим в Python 3.12.
    Таймзона намеренно отбрасывается: колонки в БД объявлены как DateTime
    без таймзоны, и хранить в них aware-значения нельзя.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
