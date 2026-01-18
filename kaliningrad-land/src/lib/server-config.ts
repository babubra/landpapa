import { cache } from "react";
import { getSiteSettings as getSiteSettingsBase } from "./config";

/**
 * Кешированная версия getSiteSettings для использования в Server Components.
 * Позволяет избежать дублирования запросов к API в рамках одного рендера (Request Memoization),
 * даже если используется cache: "no-store" (который отключает memoization у fetch).
 */
export const getSiteSettings = cache(async () => {
    return await getSiteSettingsBase();
});
