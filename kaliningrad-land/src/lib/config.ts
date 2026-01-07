/**
 * Конфигурация API для основного сайта.
 * Использует переменную окружения NEXT_PUBLIC_API_URL с fallback на localhost для разработки.
 */

const IS_SERVER = typeof window === "undefined";

// Внутренний URL для запросов сервер-сервер
// В Docker это http://backend:8000, локально http://localhost:8001
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://localhost:8001";

// Публичный URL для браузера
export const API_URL = IS_SERVER
    ? INTERNAL_API_URL
    : (process.env.NEXT_PUBLIC_API_URL || (window.location.hostname === "localhost" ? "http://localhost:8001" : ""));
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Публичные настройки сайта.
 */
export interface SiteSettings {
    site_title: string | null;
    site_name: string | null;
    site_subtitle: string | null;
    site_phone: string | null;
    site_logo: string | null;
    hero_title: string | null;
    hero_subtitle: string | null;
    hero_image: string | null;
    placeholder_image: string | null;
}

/**
 * Получить публичные настройки сайта.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const res = await fetch(`${API_URL}/api/settings/public`, {
            next: { revalidate: 60 }, // Кешируем на 60 секунд
        });
        if (!res.ok) {
            throw new Error("Failed to fetch settings");
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching settings:", error);
        // Возвращаем дефолтные значения
        return {
            site_title: null,
            site_name: null,
            site_subtitle: null,
            site_phone: null,
            site_logo: null,
            hero_title: null,
            hero_subtitle: null,
            hero_image: null,
            placeholder_image: null,
        };
    }
}

/**
 * Получить URL изображения (с учётом относительных путей).
 */
export function getImageUrl(url: string | null | undefined, fallback: string = "/hero-bg.jpg"): string {
    if (!url) return fallback;
    if (url.startsWith("http")) return url;
    // Всегда возвращаем относительный путь, так как Nginx проксирует /uploads/
    return url.startsWith("/") ? url : `/${url}`;
}
