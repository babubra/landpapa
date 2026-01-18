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
        // Development: пустая строка — используем относительные пути.
        // Next.js rewrites в next.config.ts проксируют /api/* на backend.
        return "";
    }

    // Production: пустая строка — относительные пути.
    // Nginx проксирует /api/* на backend.
    return "";
}

/**
 * API URL для использования в клиентских компонентах.
 * 
 * ВАЖНО: Теперь ВСЕГДА пустая строка на клиенте!
 * - В Development: Next.js rewrites проксируют /api/* → localhost:8001
 * - В Production: Nginx проксирует /api/* → backend:8000
 * 
 * Для SSR используйте SSR_API_URL.
 */
export const API_URL = "";


/**
 * SSR API URL - для использования в server-side компонентах
 */
export const SSR_API_URL = INTERNAL_API_URL;

// Основной URL сайта для SEO и canonical ссылок
// ВАЖНО: Должен быть без слеша в конце
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rkkland.ru";

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
    about_page: string | null;
    contacts_page: string | null;
    contacts_map_iframe: string | null;
    // SEO
    site_description: string | null;
    site_keywords: string | null;
    og_image: string | null;
    // SEO-текст на главной
    seo_homepage_text: string | null;
    // Метаданные страниц
    seo_catalog_title: string | null;
    seo_catalog_description: string | null;
    seo_about_title: string | null;
    seo_about_description: string | null;
    seo_contacts_title: string | null;
    seo_contacts_description: string | null;
    seo_news_title: string | null;
    seo_news_description: string | null;
    seo_map_title: string | null;
    seo_map_description: string | null;
    // Соцсети
    org_vk_url: string | null;
    org_telegram_url: string | null;
    org_max_url: string | null;
}

/**
 * Получить публичные настройки сайта.
 * Использует SSR_API_URL на сервере и API_URL в браузере.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        // На сервере нужен полный URL (SSR_API_URL), в браузере можно относительный
        const IS_SERVER = typeof window === "undefined";
        const baseUrl = IS_SERVER ? SSR_API_URL : API_URL;

        const res = await fetch(`${baseUrl}/api/settings/public`, {
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
            about_page: null,
            contacts_page: null,
            contacts_map_iframe: null,
            site_description: null,
            site_keywords: null,
            og_image: null,
            seo_homepage_text: null,
            seo_catalog_title: null,
            seo_catalog_description: null,
            seo_about_title: null,
            seo_about_description: null,
            seo_contacts_title: null,
            seo_contacts_description: null,
            seo_news_title: null,
            seo_news_description: null,
            seo_map_title: null,
            seo_map_description: null,
            org_vk_url: null,
            org_telegram_url: null,
            org_max_url: null,
        };
    }
}

/**
 * Получить URL изображения (с учётом относительных путей).
 * 
 * Теперь всегда использует относительные пути:
 * - В Development: Next.js rewrites проксируют /uploads/* → localhost:8001/uploads/*
 * - В Production: Nginx проксирует /uploads/* → backend:8000/uploads/*
 */
export function getImageUrl(url: string | null | undefined, fallback: string = "/hero-bg.jpg"): string {
    if (!url) return fallback;
    if (url.startsWith("http")) return url;

    // Убеждаемся что путь начинается с /
    const relativePath = url.startsWith("/") ? url : `/${url}`;

    // Всегда используем относительные пути — проксирование обеспечивается
    // Next.js rewrites (development) или Nginx (production)
    return relativePath;
}

