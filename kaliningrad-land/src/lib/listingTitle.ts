/**
 * Хелпер для генерации названия объявления по шаблону.
 * Используется в ListingCard, ListingPreview и других карточках.
 */

import type { ListingData } from "@/types/listing";

/**
 * Форматирование площади в сотках или гектарах.
 */
function formatAreaForTitle(areaM2: number | null, plotsCount: number): string {
    if (!areaM2) return "";

    let areaStr: string;
    if (areaM2 >= 10000) {
        areaStr = `${(areaM2 / 10000).toFixed(1)} га`;
    } else {
        areaStr = `${(areaM2 / 100).toFixed(1)} сот.`;
    }

    // Для нескольких участков добавляем "от"
    return plotsCount > 1 ? `от ${areaStr}` : areaStr;
}

/**
 * Обработка условного синтаксиса {ед./мн.} в шаблоне.
 */
function processConditionalSyntax(template: string, plotsCount: number): string {
    return template.replace(/\{([^/}]+)\/([^}]+)\}/g, (_, singular, plural) => {
        return plotsCount === 1 ? singular : plural;
    });
}

/**
 * Генерация названия объявления по шаблону.
 * Используется как fallback когда listing.title не задан.
 */
export function generateListingTitle(
    listing: ListingData,
    template?: string | null
): string {
    const defaultTemplate = "Продажа {участка/участков} {area} {purpose} {location}";
    const actualTemplate = template || defaultTemplate;

    const plotsCount = listing.plots_count || 1;
    const areaNum = listing.total_area ?? listing.area_min ?? null;
    const priceMin = listing.price_min;

    // Подготовка переменных
    const areaStr = formatAreaForTitle(areaNum, plotsCount);
    const locationStr = listing.location?.name_locative || listing.location?.name || "";
    const locationName = listing.location?.name || "";
    const locationType = listing.location?.settlement_type || "";
    const purposeStr = listing.land_use_name || listing.plots?.[0]?.land_use?.name || "";
    const cadastralStr = listing.plots?.[0]?.cadastral_number || "";

    // Цена с «от» для множественных участков
    let priceStr = "";
    if (priceMin) {
        const formatted = `${priceMin.toLocaleString("ru-RU")} ₽`;
        priceStr = plotsCount > 1 ? `от ${formatted}` : formatted;
    }

    // Сначала обрабатываем условный синтаксис
    let result = processConditionalSyntax(actualTemplate, plotsCount);

    // Затем заменяем переменные
    result = result
        .replace(/\{area\}/g, areaStr)
        .replace(/\{price\}/g, priceStr)
        .replace(/\{location\}/g, locationStr)
        .replace(/\{location_name\}/g, locationName)
        .replace(/\{location_type\}/g, locationType)
        .replace(/\{purpose\}/g, purposeStr)
        .replace(/\{cadastral\}/g, cadastralStr)
        .replace(/\{plots_count\}/g, String(plotsCount));

    // Убираем лишние пробелы
    return result.replace(/\s+/g, " ").trim();
}

/**
 * Получение отображаемого названия объявления.
 * Если listing.title задан — возвращает его, иначе генерирует по шаблону.
 */
export function getListingDisplayTitle(
    listing: ListingData,
    template?: string | null
): string {
    return listing.title || generateListingTitle(listing, template);
}
