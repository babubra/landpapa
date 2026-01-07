/**
 * Конфигурация API для основного сайта.
 * Использует переменную окружения NEXT_PUBLIC_API_URL с fallback на localhost для разработки.
 */

// Внутренний URL для запросов сервер-сервер
// В Docker это http://backend:8000, локально http://localhost:8001
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://localhost:8001";

/**
 * Получить API URL в зависимости от окружения (SSR или браузер).
 * ВАЖНО: Функция, а не константа, чтобы правильно работать в runtime!
 * 
 * На production в браузере возвращает пустую строку - это позволяет использовать
 * относительные пути (/api/...) которые Nginx проксирует на backend.
 */
export function getAPIURL(): string {
    const IS_SERVER = typeof window === "undefined";

    // На сервере (SSR) используем INTERNAL_API_URL для server-to-server запросов
    if (IS_SERVER) {
        return INTERNAL_API_URL;
    }

    // В браузере - проверяем окружение
    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isDev) {
        // Development: используем явный URL к backend на другом порту
        return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    }

    // Production: используем ПУСТУЮ СТРОКУ для относительных путей
    // Запросы вида `${API_URL}/api/...` превращаются в `/api/...`
    // Nginx корректно проксирует их на backend с правильным протоколом (HTTPS)
    return "";
}

/**
 * API URL для использования в компонентах.
 * 
 * Вычисляется СТАТИЧЕСКИ (без вызова функций) чтобы избежать проблем с SSR кешированием.
 * 
 * На PRODUCTION: пустая строка "" - используются относительные пути (/api /...)
 * На DEVELOPMENT: полный URL к backend
 */
export const API_URL = process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_API_URL?.includes("localhost")
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001")
    : ""; // Production: пустая строка для относительных путей

/**
 * SSR API URL - для использования в server-side компонентах
 */
export const SSR_API_URL = INTERNAL_API_URL;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Публичные настройки сайта.
 */
export interface SiteSettings {
    site_title: string | null;
    site_name: string | null;
    site_subtitle: string | null;
    site_phone: string | null;
    site_email: string | null;
    site_address: string | null;
    site_work_hours_weekdays: string | null;
    site_work_hours_weekend: string | null;
    site_logo: string | null;
    hero_title: string | null;
    hero_subtitle: string | null;
    hero_image: string | null;
    placeholder_image: string | null;
    privacy_policy: string | null;
}

/**
 * Получить публичные настройки сайта.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const res = await fetch(`${API_URL}/api/settings/public`, {
            cache: "no-store", // Не кешируем, чтобы изменения были видны сразу
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
            site_email: null,
            site_address: null,
            site_work_hours_weekdays: null,
            site_work_hours_weekend: null,
            site_logo: null,
            hero_title: null,
            hero_subtitle: null,
            hero_image: null,
            placeholder_image: null,
            privacy_policy: null,
        };
    }
}

/**
 * Получить URL изображения (с учётом относительных путей).
 */
export function getImageUrl(url: string | null | undefined, fallback: string = "/hero-bg.jpg"): string {
    if (!url) return fallback;
    if (url.startsWith("http")) return url;

    // Убеждаемся что путь начинается с /
    const relativePath = url.startsWith("/") ? url : `/${url}`;

    // В production (когда через Nginx) используем относительные пути
    // Nginx корректно проксирует /uploads/ на backend
    // В development нужны абсолютные URL так как фронт и бэк на разных портах
    const isDevelopment = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");

    if (isDevelopment) {
        const baseUrl = API_URL.replace(/\/$/, "");
        return `${baseUrl}${relativePath}`;
    }

    // Production: относительный путь (Nginx проксирует)
    return relativePath;
}
