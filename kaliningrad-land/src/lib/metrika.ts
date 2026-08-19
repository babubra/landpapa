/**
 * Яндекс.Метрика.
 *
 * ID счётчика задаётся здесь и только здесь — при смене счётчика правится одна константа.
 */
export const METRIKA_ID = 106326739;

/**
 * Официальный код счётчика.
 *
 * Вставляется обычным inline-скриптом в <head> (см. app/layout.tsx), а не через next/script,
 * чтобы код присутствовал в серверной разметке страницы: именно по исходному HTML Яндекс
 * проверяет, что счётчик установлен.
 *
 * Первый просмотр отправляется автоматически при init (параметр defer НЕ используется),
 * переходы внутри SPA досылает клиентский компонент YandexMetrika.
 */
export const METRIKA_SNIPPET = `
(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}', 'ym');

ym(${METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`;
