"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ListingCard, ListingData } from "@/components/catalog/ListingCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { Pagination } from "@/components/ui/pagination";
import { API_URL } from "@/lib/config";

interface ListingsResponse {
    items: ListingData[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export function CatalogContent() {
    const searchParams = useSearchParams();

    const [listings, setListings] = useState<ListingData[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchListings = useCallback(async () => {
        setLoading(true);

        const params = new URLSearchParams();

        // Копируем все параметры из URL
        searchParams.forEach((value, key) => {
            if (key === "district") params.set("district_id", value);
            else if (key === "settlement") params.set("settlement_id", value);
            else if (key === "settlements") params.set("settlements", value); // список settlements передаём как есть
            else if (key === "land_use") params.set("land_use_id", value);
            else params.set(key, value);
        });

        // Размер страницы
        if (!params.has("size")) params.set("size", "12");

        try {
            const res = await fetch(`${API_URL}/api/listings?${params.toString()}`);
            const data: ListingsResponse = await res.json();

            setListings(data.items);
            setTotal(data.total);
            setCurrentPage(data.page);
            setTotalPages(data.pages);
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
        // Фильтры уже применены через URL, fetchListings перезагрузит данные
    }, []);

    // Преобразуем searchParams в объект для Pagination
    const searchParamsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        searchParamsObj[key] = value;
    });

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Сайдбар с фильтрами */}
            <aside className="w-full lg:w-80 flex-shrink-0">
                <CatalogFilters onFiltersChange={handleFiltersChange} />
            </aside>

            {/* Основной контент */}
            <main className="flex-1">
                {/* Заголовок с количеством */}
                <div className="mb-6">
                    <p className="text-muted-foreground">
                        Найдено объявлений: <span className="font-medium text-foreground">{total}</span>
                    </p>
                </div>

                {/* Список карточек */}
                {loading ? (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="h-80 rounded-lg bg-muted animate-pulse"
                            />
                        ))}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">
                            По вашему запросу ничего не найдено
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Попробуйте изменить параметры фильтрации
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {listings.map((listing) => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>

                        {/* Пагинация */}
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                baseUrl="/catalog"
                                searchParams={searchParamsObj}
                            />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
