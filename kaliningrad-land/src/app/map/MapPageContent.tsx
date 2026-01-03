"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ListingsMap } from "@/components/map/ListingsMap";
import { ListingPreview } from "@/components/map/ListingPreview";
import { API_URL } from "@/lib/config";
import type { ListingData } from "@/types/listing";

interface ListingsResponse {
    items: ListingData[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export function MapPageContent() {
    const searchParams = useSearchParams();

    const [listings, setListings] = useState<ListingData[]>([]);
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    const fetchListings = useCallback(async () => {
        setLoading(true);

        const params = new URLSearchParams();

        // Копируем все параметры из URL
        searchParams.forEach((value, key) => {
            if (key === "district") params.set("district_id", value);
            else if (key === "settlement") params.set("settlement_id", value);
            else if (key === "settlements") params.set("settlements", value);
            else if (key === "land_use") params.set("land_use_id", value);
            else params.set(key, value);
        });

        // Для карты загружаем все объявления (без пагинации)
        params.set("size", "100");

        try {
            const res = await fetch(`${API_URL}/api/listings?${params.toString()}`);
            const data: ListingsResponse = await res.json();

            setListings(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error("Error fetching listings:", error);
            setListings([]);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const handleFiltersChange = useCallback(() => {
        setSelectedListing(null);
    }, []);

    const handleMarkerClick = useCallback((listing: ListingData) => {
        setSelectedListing(listing);
    }, []);

    // Фильтруем объявления с координатами
    const listingsWithCoords = listings.filter(l => l.coordinates && l.coordinates.length > 0);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Карта участков</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Левая панель — фильтры */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <CatalogFilters onFiltersChange={handleFiltersChange} baseUrl="/map" total={total} />
                    {listingsWithCoords.length < total && (
                        <p className="text-xs text-muted-foreground mt-2">
                            На карте: {listingsWithCoords.length} из {total}
                        </p>
                    )}
                </aside>

                {/* Правая область — карта и превью */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Карта */}
                    <div className="h-[500px] rounded-lg overflow-hidden border relative z-0">
                        {loading ? (
                            <div className="h-full flex items-center justify-center bg-muted">
                                <p className="text-muted-foreground">Загрузка карты...</p>
                            </div>
                        ) : (
                            <ListingsMap
                                listings={listingsWithCoords}
                                selectedId={selectedListing?.id}
                                onMarkerClick={handleMarkerClick}
                            />
                        )}
                    </div>

                    {/* Превью объявления */}
                    {selectedListing && (
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
