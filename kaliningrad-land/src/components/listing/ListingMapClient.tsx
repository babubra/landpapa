"use client";

import dynamic from "next/dynamic";

/**
 * Обертка для карты, которая отключает SSR (Server Side Rendering).
 * Leaflet требует наличия объекта 'window', поэтому карта может работать только в браузере.
 */
export const ListingMapClient = dynamic(
    () => import("./ListingMap").then((mod) => mod.ListingMap),
    {
        ssr: false,
        loading: () => (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка карты...</p>
            </div>
        ),
    }
);
