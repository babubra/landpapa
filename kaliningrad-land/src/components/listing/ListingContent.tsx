"use client";

import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingSidebar, ListingInfoBlock, ListingPlotsBlock } from "@/components/listing/ListingSidebar";
import { ListingMapClient } from "@/components/listing/ListingMapClient";
import { Breadcrumbs, BreadcrumbItem } from "@/components/seo/Breadcrumbs";
import { ListingProvider } from "@/context/ListingContext";

interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    address: string | null;
    price_public: number | null;
    status: string;
    land_use: { name: string } | null;
    land_category: { name: string } | null;
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

interface ImageType {
    url: string;
    thumbnail_url: string | null;
}

interface Realtor {
    phone: string;
}

interface Settlement {
    name: string;
    slug?: string;
    type?: string | null;
    district?: {
        name: string;
        slug?: string;
    };
}

interface ListingDetail {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    price_min: number | null;
    price_max: number | null;
    total_area: number | null;
    area_min: number | null;
    area_max: number | null;
    plots_count: number;
    realtor: Realtor;
    settlement?: Settlement | null;
    plots: Plot[];
    images: ImageType[];
}

interface ListingContentProps {
    listing: ListingDetail;
    breadcrumbs: BreadcrumbItem[];
    h1: string;  // Заголовок H1, генерируемый на сервере по шаблону
}

/**
 * Клиентский компонент для рендеринга содержимого страницы листинга.
 * Переиспользуется в /listing/[slug] и /[...geo] роутах.
 */
export function ListingContent({ listing, breadcrumbs, h1 }: ListingContentProps) {
    // Формируем локацию
    const location = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : undefined;

    // Определяем основное назначение земли
    const landUse = listing.plots[0]?.land_use?.name;

    // H1 используется напрямую из пропсов
    // Для ALT-тегов добавляем регион если нет
    const displayTitle = h1.toLowerCase().includes("калининград")
        ? h1
        : `${h1}, Калининградская область`;

    return (
        <ListingProvider>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-6xl">
                    {/* Хлебные крошки */}
                    <Breadcrumbs items={breadcrumbs} />

                    {/* Заголовок */}
                    <h1 className="text-3xl font-bold mb-8">{h1}</h1>

                    {/* Основной контент */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Левая колонка: галерея + описание */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Галерея */}
                            <ListingGallery
                                images={listing.images}
                                title={displayTitle}
                            />

                            {/* Sidebar Info для мобильных (над описанием) */}
                            <div className="lg:hidden mb-8">
                                <ListingInfoBlock
                                    phone={listing.realtor.phone}
                                    priceMin={listing.price_min}
                                    priceMax={listing.price_max}
                                    totalArea={listing.total_area}
                                    areaMin={listing.area_min}
                                    areaMax={listing.area_max}
                                    plotsCount={listing.plots_count}
                                    landUse={landUse}
                                    landCategory={listing.plots[0]?.land_category?.name}
                                    cadastralNumber={listing.plots[0]?.cadastral_number || undefined}
                                    location={location}
                                    plots={listing.plots}
                                />
                            </div>

                            {/* Описание */}
                            {listing.description && (
                                <div>
                                    <h2 className="text-xl font-semibold mb-4">Описание</h2>
                                    <div
                                        className="prose prose-sm max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: listing.description }}
                                    />
                                </div>
                            )}

                            {/* Карта и Список участков (мобильный) */}
                            <div>
                                <ListingMapClient plots={listing.plots} />

                                <div className="lg:hidden mt-6">
                                    <ListingPlotsBlock plots={listing.plots} />
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка: боковая панель (только десктоп) */}
                        <div className="hidden lg:block">
                            <div className="sticky top-24">
                                <ListingSidebar
                                    phone={listing.realtor.phone}
                                    priceMin={listing.price_min}
                                    priceMax={listing.price_max}
                                    totalArea={listing.total_area}
                                    areaMin={listing.area_min}
                                    areaMax={listing.area_max}
                                    plotsCount={listing.plots_count}
                                    landUse={landUse}
                                    landCategory={listing.plots[0]?.land_category?.name}
                                    cadastralNumber={listing.plots[0]?.cadastral_number || undefined}
                                    location={location}
                                    plots={listing.plots}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ListingProvider>
    );
}
