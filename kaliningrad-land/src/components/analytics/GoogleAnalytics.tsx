import Script from "next/script";

// ID счётчика Google Analytics
const GA_ID = "G-8CB089TX3Q";

/**
 * Компонент Google Analytics (gtag.js).
 * 
 * Автоматически отслеживает:
 * - Просмотры страниц (включая SPA-переходы)
 * - События пользователей
 * 
 * Использование: добавить в layout.tsx
 */
export function GoogleAnalytics() {
    return (
        <>
            {/* Загрузка gtag.js */}
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="lazyOnload"
            />

            {/* Инициализация Google Analytics */}
            <Script id="google-analytics" strategy="lazyOnload">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
            </Script>
        </>
    );
}
