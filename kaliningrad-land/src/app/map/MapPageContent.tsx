"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ListingsMapClient } from "@/components/map/ListingsMapClient";
import { ListingPreview } from "@/components/map/ListingPreview";
import type { ListingData } from "@/types/listing";
import type { PlotViewportItem, ClusterItem, ViewportBounds } from "@/types/map";

interface ViewportState {
    bounds: ViewportBounds;
    zoom: number;
}

export function MapPageContent() {
    const searchParams = useSearchParams();

    // Данные с API
    const [plots, setPlots] = useState<PlotViewportItem[]>([]);
    const [clusters, setClusters] = useState<ClusterItem[]>([]);
    const [totalInViewport, setTotalInViewport] = useState(0);

    // Состояние карты
    const [viewport, setViewport] = useState<ViewportState | null>(null);
    const [loading, setLoading] = useState(false);

    // Выбранное объявление для превью
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Debounce для запросов
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        // Копируем фильтры из URL
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

            setPlots(data.plots || []);
            setClusters(data.clusters || []);
            setTotalInViewport(data.total_in_viewport || 0);
        } catch (error) {
            console.error("Error fetching viewport data:", error);
            // Не очищаем данные при ошибке, чтобы избежать мигания
            // setPlots([]);
            // setClusters([]);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    // Обработчик изменения viewport с debounce
    const handleViewportChange = useCallback((bounds: ViewportBounds, zoom: number) => {
        const newViewport = { bounds, zoom };
        setViewport(newViewport);

        // Debounce запроса
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(() => {
            fetchData(newViewport);
        }, 300);
    }, [fetchData]);

    // Перезагрузка при изменении фильтров
    useEffect(() => {
        if (viewport) {
            fetchData(viewport);
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFiltersChange = useCallback(() => {
        setSelectedListing(null);
    }, []);

    // Клик по участку — загрузить превью объявления
    const handlePlotClick = useCallback(async (plot: PlotViewportItem) => {
        if (!plot.listing_slug) return;

        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/listings/${plot.listing_slug}`);
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

    // Клик по кластеру — zoom к его границам (обрабатывается в компоненте карты)
    const handleClusterClick = useCallback((cluster: ClusterItem) => {
        // Карта сама обработает zoom к bounds кластера
    }, []);

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
                            {clusters.length > 0 && ` (${clusters.length} кластеров)`}
                        </p>
                    )}
                </aside>

                {/* Правая область — карта и превью */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Карта */}
                    <div className="h-[500px] rounded-lg overflow-hidden border relative z-0">
                        <ListingsMapClient
                            plots={plots}
                            clusters={clusters}
                            selectedPlotId={selectedListing?.id}
                            onViewportChange={handleViewportChange}
                            onPlotClick={handlePlotClick}
                            onClusterClick={handleClusterClick}
                            loading={loading}
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
