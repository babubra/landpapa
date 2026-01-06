/**
 * Конфигурация API для основного сайта.
 * Использует переменную окружения NEXT_PUBLIC_API_URL с fallback на localhost для разработки.
 */

const IS_SERVER = typeof window === "undefined";
export const API_URL = IS_SERVER ? (process.env.NEXT_PUBLIC_API_URL || "http://backend:8000") : "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Публичные настройки сайта.
 */
export interface SiteSettings {
    site_title: string | null;
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
            site_title: "КалининградЗем",
            site_subtitle: "Земельные участки",
            site_phone: "+7 (4012) 12-34-56",
            site_logo: null,
            hero_title: "Земельные участки в Калининградской области",
            hero_subtitle: "Найдите идеальный участок для строительства дома, ведения хозяйства или инвестиций",
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
    return `${API_URL}${url}`;
}
