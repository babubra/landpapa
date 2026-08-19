import { trackPageview } from "./metrika";

/**
 * Хеши, которые превращают модалку заявки в отдельные «посадочные страницы».
 *
 * По ним настраиваются цели в Метрике и ведётся реклама, например:
 * https://rkkland.ru/#podbor-uchastka — страница сразу открывается с формой заявки.
 * Переименовывать здесь — остальное подхватится автоматически.
 */
export const LEAD_FORM_HASH = "#podbor-uchastka";
export const LEAD_SUCCESS_HASH = "#zayavka-prinyata";

/** Текущий адрес страницы с подставленным хешем. */
export function urlWithHash(hash: string): string {
    return window.location.pathname + window.location.search + hash;
}

/** Засчитать в Метрике просмотр «страницы» с этим хешем. */
export function trackHashPageview(hash: string, title: string) {
    trackPageview(urlWithHash(hash), title);
}
