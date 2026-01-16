"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Компонент для синхронизации позиции карты с URL.
 * Сохраняет lat, lon, zoom в URL при изменении viewport.
 * Восстанавливает позицию при загрузке страницы.
 */
export function MapUrlSync() {
    const map = useMap();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isInitialized = useRef(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Обновление URL с debounce
    const updateUrl = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            const center = map.getCenter();
            const zoom = map.getZoom();

            const params = new URLSearchParams(searchParams.toString());
            params.set("lat", center.lat.toFixed(6));
            params.set("lon", center.lng.toFixed(6));
            params.set("zoom", zoom.toString());

            // Shallow update без перезагрузки
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }, 300);
    }, [map, router, searchParams, pathname]);

    useEffect(() => {
        // Восстановление позиции из URL при первой загрузке
        if (!isInitialized.current) {
            const lat = searchParams.get("lat");
            const lon = searchParams.get("lon");
            const zoom = searchParams.get("zoom");

            if (lat && lon) {
                const latNum = parseFloat(lat);
                const lonNum = parseFloat(lon);
                const zoomNum = zoom ? parseInt(zoom, 10) : map.getZoom();

                if (!isNaN(latNum) && !isNaN(lonNum)) {
                    map.setView([latNum, lonNum], zoomNum, { animate: false });
                }
            }
            isInitialized.current = true;
        }

        // Подписка на события карты
        map.on("moveend", updateUrl);
        map.on("zoomend", updateUrl);

        return () => {
            map.off("moveend", updateUrl);
            map.off("zoomend", updateUrl);
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [map, searchParams, updateUrl]);

    return null;
}
