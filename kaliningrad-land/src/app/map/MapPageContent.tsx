"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MapFilters } from "@/components/map/MapFilters";
import { ListingsMapClient } from "@/components/map/ListingsMapClient";
import { ListingPreview } from "@/components/map/ListingPreview";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { ListingData } from "@/types/listing";
import { PlotPoint, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";

// Высота хедера (h-16 = 64px) + высота фильтров (~56px)
const HEADER_HEIGHT = 64;
const FILTERS_HEIGHT = 56;

export function MapPageContent() {
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();

    // Данные с API
    const [plots, setPlots] = useState<PlotPoint[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Выбранное объявление для превью и выделения пинов (только desktop)
    const [selectedListingSlug, setSelectedListingSlug] = useState<string | null>(null);
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Загрузка всех участков при монтировании и при изменении фильтров
    const fetchData = useCallback(async () => {
        setLoading(true);

        const params = new URLSearchParams();

        // Копируем фильтры из URL (исключаем lat, lon, zoom — это для карты)
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
        setSelectedListingSlug(null);
    }, []);

    // Клик по маркеру:
    // - На мобильных — popup открывается автоматически в карте
    // - На десктопе — показываем боковую панель превью
    const handleMarkerClick = useCallback(async (plot: PlotPoint) => {
        if (!plot.listing_slug) return;

        // Сохраняем slug для выделения ВСЕХ участков этого объявления
        setSelectedListingSlug(plot.listing_slug);

        // На десктопе — показываем превью сбоку
        if (!isMobile) {
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
        }
    }, [isMobile]);

    // Расчёт высоты карты
    const mapHeight = `calc(100vh - ${HEADER_HEIGHT}px - ${FILTERS_HEIGHT}px)`;

    return (
        <div className="flex flex-col h-screen">
            {/* Компактные фильтры сверху */}
            <MapFilters
                onFiltersChange={handleFiltersChange}
                total={total}
                isMobile={isMobile}
            />

            {/* Основная область: карточка слева + карта */}
            <div className="flex flex-1 relative" style={{ height: mapHeight }}>
                {/* Карточка превью слева поверх карты (только desktop) */}
                {!isMobile && selectedListing && !loadingPreview && (
                    <div className="absolute left-0 top-0 bottom-0 z-[1000]">
                        <ListingPreview
                            listing={selectedListing}
                            onClose={() => {
                                setSelectedListing(null);
                                setSelectedListingSlug(null);
                            }}
                        />
                    </div>
                )}

                {/* Загрузка превью */}
                {!isMobile && loadingPreview && (
                    <div className="absolute left-0 top-0 bottom-0 z-[1000] w-[350px] border-r bg-card flex items-center justify-center">
                        <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                )}

                {/* Карта */}
                <div className="flex-1 relative">
                    <ListingsMapClient
                        plots={plots}
                        selectedListingSlug={selectedListingSlug ?? undefined}
                        onMarkerClick={handleMarkerClick}
                        loading={loading}
                        initialCenter={DEFAULT_MAP_CENTER}
                        initialZoom={DEFAULT_MAP_ZOOM}
                        isMobile={isMobile}
                    />
                </div>
            </div>
        </div>
    );
}
