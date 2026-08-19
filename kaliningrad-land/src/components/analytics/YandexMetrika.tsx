"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { METRIKA_ID, trackPageview } from "@/lib/metrika";

/**
 * Отслеживание SPA-переходов для Яндекс.Метрики.
 *
 * Сам код счётчика подключён inline в <head> (app/layout.tsx) — он же отправляет
 * просмотр первой страницы. Здесь досылаются только переходы по клиентскому роутеру,
 * при которых страница не перезагружается.
 */
export function YandexMetrika() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Просмотр стартовой страницы уже отправлен при init счётчика — не дублируем
    const lastTrackedUrl = useRef<string | null>(null);

    useEffect(() => {
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

        // Первый рендер только запоминает адрес, хит по нему уже отправил сам счётчик.
        // Дальше сверяемся с последним отправленным: history.pushState (например, при
        // открытии модалки на своём хеше) тоже дёргает роутер, но новой страницей не является
        if (lastTrackedUrl.current === null) {
            lastTrackedUrl.current = url;
            return;
        }

        if (lastTrackedUrl.current === url) {
            return;
        }

        lastTrackedUrl.current = url;
        trackPageview(url, document.title);
    }, [pathname, searchParams]);

    return (
        <noscript>
            <div>
                <img
                    src={`https://mc.yandex.ru/watch/${METRIKA_ID}`}
                    style={{ position: "absolute", left: "-9999px" }}
                    alt=""
                />
            </div>
        </noscript>
    );
}
