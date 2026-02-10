"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const METRIKA_ID = 106326739;

declare global {
    interface Window {
        ym: (id: number, action: string, ...args: unknown[]) => void;
    }
}

export function YandexMetrika() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isFirstHitSent = useRef(false);

    // Отправка hit при изменении маршрута
    useEffect(() => {
        // Ждём, пока Метрика полностью загрузится
        if (typeof window === "undefined" || !window.ym) {
            return;
        }

        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

        // Первый hit отправляем только один раз
        if (!isFirstHitSent.current) {
            isFirstHitSent.current = true;
        }

        window.ym(METRIKA_ID, "hit", url, {
            title: document.title,
        });
    }, [pathname, searchParams]);

    return (
        <>
            <Script
                id="yandex-metrika-init"
                strategy="lazyOnload"
            >
                {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {
              if (document.scripts[j].src === r) { return; }
            }
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

          ym(${METRIKA_ID}, 'init', {
            defer: true,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
            ecommerce: "dataLayer"
          });
        `}
            </Script>

            <noscript>
                <div>
                    <img
                        src={`https://mc.yandex.ru/watch/${METRIKA_ID}`}
                        style={{ position: "absolute", left: "-9999px" }}
                        alt=""
                    />
                </div>
            </noscript>
        </>
    );
}
