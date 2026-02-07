"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ListingProvider } from "@/context/ListingContext";

// Динамический импорт карты для SSR
const ListingMap = dynamic(
    () => import("@/components/listing/ListingMap").then((mod) => mod.ListingMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка карты...</p>
            </div>
        ),
    }
);

interface PlotForMap {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
    status: string;
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

interface ScreenshotMapClientProps {
    plots: PlotForMap[];
}

/**
 * Клиентский компонент для скриншота карты.
 * Устанавливает window.__MAP_READY__ после загрузки карты.
 */
export function ScreenshotMapClient({ plots }: ScreenshotMapClientProps) {
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        // Даём карте время на полную загрузку тайлов
        const timer = setTimeout(() => {
            setMapReady(true);
            // Сигнал для Playwright что карта готова к скриншоту
            (window as any).__MAP_READY__ = true;
        }, 3000); // 3 секунды на загрузку тайлов

        return () => clearTimeout(timer);
    }, []);

    return (
        <ListingProvider>
            <style>{`
                /* Скрываем элементы управления для чистого скриншота */
                .leaflet-control-zoom,
                .leaflet-control-layers,
                .leaflet-control-attribution {
                    display: none !important;
                }
            `}</style>
            <div className="w-full h-full">
                <ListingMap
                    plots={plots}
                    className="w-full h-full !aspect-auto"
                />
                {/* Скрытый индикатор готовности для Playwright */}
                {mapReady && <div id="map-ready-indicator" style={{ display: "none" }} />}
            </div>
        </ListingProvider>
    );
}
