"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ListingsMapClient } from "@/components/map/ListingsMapClient";
import { ListingPreview } from "@/components/map/ListingPreview";
import type { ListingData } from "@/types/listing";
import type { MapMarkerItem, ViewportBounds } from "@/types/map";

interface ViewportState {
    bounds: ViewportBounds;
    zoom: number;
}

// Дефолтные значения для Калининграда
const DEFAULT_CENTER: [number, number] = [54.7104, 20.4522];
const DEFAULT_ZOOM = 9;

export function MapPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Начальные значения из URL (для восстановления при навигации "назад")
    const initialCenter = useMemo((): [number, number] => {
        const lat = searchParams.get("lat");
        const lon = searchParams.get("lon");
        if (lat && lon) {
            const parsedLat = parseFloat(lat);
            const parsedLon = parseFloat(lon);
            if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
                return [parsedLat, parsedLon];
            }
        }
        return DEFAULT_CENTER;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const initialZoom = useMemo((): number => {
        const zoom = searchParams.get("zoom");
        if (zoom) {
            const parsed = parseInt(zoom, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
                return parsed;
            }
        }
        return DEFAULT_ZOOM;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Данные с API
    const [markers, setMarkers] = useState<MapMarkerItem[]>([]);
    const [totalInViewport, setTotalInViewport] = useState(0);

    // Состояние карты
    const [viewport, setViewport] = useState<ViewportState | null>(null);
    const [loading, setLoading] = useState(false);

    // Выбранное объявление для превью
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Debounce для запросов
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Загрузка данных при изменении viewport или фильтров
    const fetchData = useCallback(async (vp: ViewportState) => {
        setLoading(true);

        const params = new URLSearchParams();

        // Viewport параметры
        params.set("north", String(vp.bounds.north));
        params.set("south", String(vp.bounds.south));
        params.set("east", String(vp.bounds.east));
        params.set("west", String(vp.bounds.west));
        params.set("zoom", String(vp.zoom));

        // Копируем фильтры из URL (исключая параметры карты)
        searchParams.forEach((value, key) => {
            if (key === "district") params.set("district_id", value);
            else if (key === "settlement") params.set("settlement_id", value);
            else if (key === "settlements") params.set("settlements", value);
            else if (key === "land_use") params.set("land_use_id", value);
            else if (key === "price_min") params.set("price_min", value);
            else if (key === "price_max") params.set("price_max", value);
            else if (key === "area_min") params.set("area_min", value);
            else if (key === "area_max") params.set("area_max", value);
        });

        try {
            const res = await fetch(`/api/public-plots/viewport?${params.toString()}`);
            const data = await res.json();

            setMarkers(data.markers || []);
            setTotalInViewport(data.total_in_viewport || 0);
        } catch (error) {
            console.error("Error fetching viewport data:", error);
            // Не очищаем данные при ошибке, чтобы избежать мигания
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    // Обработчик изменения viewport с debounce
    const handleViewportChange = useCallback((bounds: ViewportBounds, zoom: number) => {
        const newViewport = { bounds, zoom };
        setViewport(newViewport);

        // Debounce запроса данных
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
            fetchData(newViewport);
        }, 300);

        // Debounce обновления URL (реже, чтобы не спамить историю)
        if (urlUpdateTimeoutRef.current) {
            clearTimeout(urlUpdateTimeoutRef.current);
        }
        urlUpdateTimeoutRef.current = setTimeout(() => {
            // Вычисляем центр viewport
            const centerLat = (bounds.north + bounds.south) / 2;
            const centerLon = (bounds.east + bounds.west) / 2;

            // Сохраняем существующие фильтры
            const params = new URLSearchParams(searchParams.toString());
            params.set("lat", centerLat.toFixed(4));
            params.set("lon", centerLon.toFixed(4));
            params.set("zoom", String(zoom));

            // Обновляем URL без создания новой записи в истории
            router.replace(`/map?${params.toString()}`, { scroll: false });
        }, 500);
    }, [fetchData, searchParams, router]);

    // Перезагрузка при изменении фильтров (кроме параметров карты)
    useEffect(() => {
        if (viewport) {
            fetchData(viewport);
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFiltersChange = useCallback(() => {
        setSelectedListing(null);
    }, []);

    // Клик по маркеру
    const handleMarkerClick = useCallback(async (marker: MapMarkerItem) => {
        // Кластер — обрабатывается в компоненте карты (zoom к bounds)
        if (marker.type === "cluster") return;

        // Точка — загрузить превью объявления
        if (!marker.listing_slug) return;

        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/listings/${marker.listing_slug}`);
            if (res.ok) {
                const listing = await res.json();
                setSelectedListing(listing);
            }
        } catch (error) {
            console.error("Error loading listing preview:", error);
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    // Подсчёт кластеров для статистики
    const clustersCount = markers.filter(m => m.type === "cluster").length;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Карта участков</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Левая панель — фильтры */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <CatalogFilters onFiltersChange={handleFiltersChange} baseUrl="/map" total={totalInViewport} />
                    {totalInViewport > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            В области просмотра: {totalInViewport} участков
                            {clustersCount > 0 && ` (${clustersCount} кластеров)`}
                        </p>
                    )}
                </aside>

                {/* Правая область — карта и превью */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Карта */}
                    <div className="h-[500px] rounded-lg overflow-hidden border relative z-0">
                        <ListingsMapClient
                            markers={markers}
                            selectedListingSlug={selectedListing?.slug}
                            onViewportChange={handleViewportChange}
                            onMarkerClick={handleMarkerClick}
                            loading={loading}
                            initialCenter={initialCenter}
                            initialZoom={initialZoom}
                        />
                    </div>

                    {/* Превью объявления */}
                    {loadingPreview && (
                        <div className="border rounded-lg bg-card p-4">
                            <p className="text-muted-foreground text-center">Загрузка...</p>
                        </div>
                    )}
                    {selectedListing && !loadingPreview && (
                        <div className="border rounded-lg bg-card">
                            <ListingPreview
                                listing={selectedListing}
                                onClose={() => setSelectedListing(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
