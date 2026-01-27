"use client";

import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingSidebar } from "@/components/listing/ListingSidebar";
import { ListingMapClient } from "@/components/listing/ListingMapClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { getImageUrl, SITE_URL, type SiteSettings } from "@/lib/config";

export interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    address: string | null;
    price_public: number | null;
    status: string;
    land_use: { name: string } | null;
    land_category: { name: string } | null;
    // Геоданные
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

export interface Realtor {
    phone: string;
}

export interface Settlement {
    name: string;
    slug: string;
    type?: string;
    district?: {
        name: string;
        slug: string;
    };
}

export interface ImageType {
    url: string;
    thumbnail_url: string | null;
}

export interface ListingDetail {
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
    meta_title: string | null;
    meta_description: string | null;
}

interface ListingDetailViewProps {
    listing: ListingDetail;
    settings: SiteSettings;
    geoParams?: {
        districtSlug: string;
        settlementSlug?: string;
    };
}

export function ListingDetailView({ listing, settings, geoParams }: ListingDetailViewProps) {
    // Schema.org Product/Offer
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "description": listing.description,
        "image": listing.images.map(img => getImageUrl(img.thumbnail_url || img.url)),
        "offers": {
            "@type": "Offer",
            "price": listing.price_min,
            "priceCurrency": "RUB",
            "availability": "https://schema.org/InStock",
            "url": `${SITE_URL}/listing/${listing.slug}`, // TODO: Update URL if moved
        }
    };

    // Формируем локацию
    const location = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : undefined;

    // Определяем основное назначение земли
    const landUse = listing.plots[0]?.land_use?.name;

    // Формируем заголовок для UI
    // Формируем заголовок для UI
    let displayTitle = listing.title;

    if (listing.settlement?.name && listing.settlement?.type) {
        const name = listing.settlement.name;
        const typeShort = listing.settlement.type;
        const typeFull = `${typeShort}. ${name}`;

        // Проверяем, есть ли уже тип перед именем
        // Примитивная проверка на наличие подстроки "п. Курган" или "пос. Курган" может быть недостаточно,
        // если в тексте "пос. Курганы", а мы ищем "Курган". Но обычно H1 содержит точное название.

        // Более надежный способ: найти вхождение слова и проверить текст перед ним.
        const regexName = new RegExp(`\\b${name}\\b`, 'u');
        const match = displayTitle.match(regexName);

        if (match && match.index !== undefined) {
            const before = displayTitle.substring(0, match.index).trim();
            // Проверяем хвост строки "before"
            const prefixes = [typeShort + ".", "пос.", "г.", "д.", "с.", "ст."];
            const hasPrefix = prefixes.some(p => before.endsWith(p));

            if (!hasPrefix) {
                // Заменяем найденное вхождение
                displayTitle = displayTitle.slice(0, match.index) + typeFull + displayTitle.slice(match.index + name.length);
            }
        }
    }

    if (!displayTitle.toLowerCase().includes("калининград")) {
        displayTitle = `${displayTitle}, Калининградская область`;
    }

    // Breadcrumbs
    const breadcrumbItems = [
        { name: "Каталог", href: "/catalog" },
    ];

    if (listing.settlement?.district) {
        // Предполагаем, что район есть в geoUrl, но если нет, используем название
        // Лучше использовать то, что пришло из пропсов geoParams, если оно есть
        const dName = listing.settlement.district.name;
        // const dSlug = ??? -> В ListingDetail нет district.slug, только name. 
        // Но мы обновили backend API чтобы возвращать slug.
        // Однако интерфейс ListingDetail здесь пока старый (Settlement { district?: {name: string}}).
        // Надо обновить интерфейс если API возвращает slug.
        breadcrumbItems.push({ name: dName, href: "#" }); // Временно заглушка или использовать geoParams
    }

    // Но подождите, мы хотим красивый breadcrumb.
    // Если мы переходим на /catalog/district/settlement/listing, мы знаем весь путь.

    // Переопределим breadcrumbs если переданы geoParams
    const finalBreadcrumbs = [
        { name: "Каталог", href: "/catalog" },
    ];

    if (geoParams && listing.settlement?.district) {
        finalBreadcrumbs.push({
            name: listing.settlement.district.name,
            href: `/catalog/${geoParams.districtSlug}`
        });

        if (geoParams.settlementSlug && listing.settlement) {
            finalBreadcrumbs.push({
                name: listing.settlement.name,
                href: `/catalog/${geoParams.districtSlug}/${geoParams.settlementSlug}`
            });
        }
    } else {
        // Fallback если нет параметров (старый вариант)
        finalBreadcrumbs.push({ name: listing.title, href: "#" });
    }

    finalBreadcrumbs.push({ name: listing.title, href: "#" }); // Текущая страница без ссылки

    return (
        <div className="min-h-screen bg-background">
            <SeoJsonLd data={jsonLd} />
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <Breadcrumbs items={finalBreadcrumbs} />

                <h1 className="text-3xl font-bold mb-8">{displayTitle}</h1>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Левая колонка: галерея + описание */}
                    <div className="lg:col-span-2 space-y-8">
                        <ListingGallery
                            images={listing.images}
                            title={displayTitle}
                            placeholderImage={getImageUrl(settings.placeholder_image)}
                        />

                        {listing.description && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Описание</h2>
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: listing.description }}
                                />
                            </div>
                        )}

                        <div>
                            <h2 className="text-xl font-semibold mb-4">Расположение на карте</h2>
                            <ListingMapClient plots={listing.plots} />
                        </div>
                    </div>

                    {/* Правая колонка: боковая панель */}
                    <div>
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
    );
}
