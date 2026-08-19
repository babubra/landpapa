"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { METRIKA_ID } from "@/lib/metrika";

declare global {
    interface Window {
        ym?: (id: number, action: string, ...args: unknown[]) => void;
    }
}

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
    const isInitialRender = useRef(true);

    useEffect(() => {
        // Просмотр стартовой страницы уже отправлен при init счётчика — не дублируем
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        if (typeof window.ym !== "function") {
            return;
        }

        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

        window.ym(METRIKA_ID, "hit", url, {
            title: document.title,
        });
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
