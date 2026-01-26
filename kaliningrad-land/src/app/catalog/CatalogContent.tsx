"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { ListingCard, ListingData } from "@/components/catalog/ListingCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { Pagination } from "@/components/ui/pagination";
import type { ListingsResponse } from "./page";

interface CatalogContentProps {
    initialData: ListingsResponse;
}

export function CatalogContent({ initialData }: CatalogContentProps) {
    const searchParams = useSearchParams();

    // Инициализируем state данными с сервера
    const [listings, setListings] = useState<ListingData[]>(initialData.items);
    const [total, setTotal] = useState(initialData.total);
    const [currentPage, setCurrentPage] = useState(initialData.page);
    const [totalPages, setTotalPages] = useState(initialData.pages);
    const [loading, setLoading] = useState(false); // Не true — данные уже есть!

    // Флаг для пропуска первого рендера
    const isFirstRender = useRef(true);

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
            const res = await fetch(`/api/listings?${params.toString()}`);
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
        // Пропускаем первый рендер — данные уже получены с сервера
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        // При изменении URL параметров — загружаем новые данные
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
