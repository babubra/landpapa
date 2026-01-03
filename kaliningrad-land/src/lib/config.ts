/**
 * Конфигурация API для основного сайта.
 * Использует переменную окружения NEXT_PUBLIC_API_URL с fallback на localhost для разработки.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
