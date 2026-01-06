"use client";

import dynamic from "next/dynamic";

/**
 * Обертка для карты со списком всех участков, которая отключает SSR.
 * Leaflet не работает на сервере, так как требует объекты браузера (window, document).
 */
export const ListingsMapClient = dynamic(
    () => import("./ListingsMap").then((mod) => mod.ListingsMap),
    {
        ssr: false,
        loading: () => (
            <div className="h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Загрузка карты...</p>
            </div>
        ),
    }
);
