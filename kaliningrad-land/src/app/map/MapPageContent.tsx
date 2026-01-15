"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ListingsMapClient } from "@/components/map/ListingsMapClient";
import { ListingPreview } from "@/components/map/ListingPreview";
import type { ListingData } from "@/types/listing";
import { PlotPoint, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";



export function MapPageContent() {
    const searchParams = useSearchParams();

    // Данные с API
    const [plots, setPlots] = useState<PlotPoint[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Выбранное объявление для превью
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Загрузка всех участков при монтировании и при изменении фильтров
    const fetchData = useCallback(async () => {
        setLoading(true);

        const params = new URLSearchParams();

        // Копируем фильтры из URL
        searchParams.forEach((value, key) => {
            if (key === "district") params.set("district_id", value);
            else if (key === "settlements") params.set("settlements", value);
            else if (key === "land_use") params.set("land_use_id", value);
            else if (key === "price_min") params.set("price_min", value);
            else if (key === "price_max") params.set("price_max", value);
            else if (key === "area_min") params.set("area_min", value);
            else if (key === "area_max") params.set("area_max", value);
        });

        try {
            const url = params.toString()
                ? `/api/public-plots/all?${params.toString()}`
                : `/api/public-plots/all`;
            const res = await fetch(url);
            const data = await res.json();

            setPlots(data.plots || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error("Ошибка загрузки участков:", error);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    // Загрузка при монтировании и изменении фильтров
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFiltersChange = useCallback(() => {
        setSelectedListing(null);
    }, []);

    // Клик по маркеру — загрузить превью объявления
    const handleMarkerClick = useCallback(async (plot: PlotPoint) => {
        if (!plot.listing_slug) return;

        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/listings/${plot.listing_slug}`);
            if (res.ok) {
                const listing = await res.json();
                setSelectedListing(listing);
            }
        } catch (error) {
            console.error("Ошибка загрузки превью:", error);
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Карта участков</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Левая панель — фильтры */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <CatalogFilters onFiltersChange={handleFiltersChange} baseUrl="/map" total={total} />
                    {total > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Найдено: {total} участков
                        </p>
                    )}
                </aside>

                {/* Правая область — карта и превью */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Карта */}
                    <div className="h-[500px] rounded-lg overflow-hidden border relative z-0">
                        <ListingsMapClient
                            plots={plots}
                            selectedListingSlug={selectedListing?.slug}
                            onMarkerClick={handleMarkerClick}
                            loading={loading}
                            initialCenter={DEFAULT_MAP_CENTER}
                            initialZoom={DEFAULT_MAP_ZOOM}
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
