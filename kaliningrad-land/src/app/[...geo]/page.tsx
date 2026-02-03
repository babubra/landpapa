/**
 * Catch-all роут для гео-зависимых URL.
 * 
 * Обрабатывает:
 * - /{district_slug} — каталог по району
 * - /{district_slug}/{settlement_slug} — каталог по населённому пункту
 * - /{district_slug}/{settlement_slug}/{listing_slug} — страница листинга
 * - /{district_slug}/{listing_slug} — страница листинга (только район)
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogContent } from "@/app/catalog/CatalogContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SSR_API_URL, SITE_URL, getImageUrl } from "@/lib/config";
import type { ListingsResponse } from "@/app/catalog/page";
import type { ListingData } from "@/types/listing";
import { buildGeoBreadcrumbs, formatSettlementName, type GeoLocation } from "@/lib/geoUrl";
import { ListingContent } from "@/components/listing/ListingContent";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";

// === Приватные страницы (не обрабатывать как гео-URL) ===
const RESERVED_SLUGS = [
    "about", "contacts", "map", "news", "privacy",
    "catalog", "listing", "api", "_next"
];

// === Типы ===
interface GeoPageProps {
    params: Promise<{ geo: string[] }>;
    searchParams: Promise<Record<string, string>>;
}

interface ResolvedLocation {
    district_id: number | null;
    district_name: string | null;
    district_slug: string | null;
    settlement_id: number | null;
    settlement_name: string | null;
    settlement_slug: string | null;
    settlement_type: string | null;
}

// Новая структура для иерархических локаций
interface ResolvedLocationNew {
    locations: {
        id: number;
        name: string;
        slug: string;
        type: string;
        settlement_type: string | null;
    }[];
    leaf_id: number | null;
}

// === API функции ===

async function resolveLocation(
    districtSlug?: string,
    settlementSlug?: string
): Promise<ResolvedLocation | null> {
    try {
        const params = new URLSearchParams();
        if (districtSlug) params.set("district_slug", districtSlug);
        if (settlementSlug) params.set("settlement_slug", settlementSlug);

        const res = await fetch(
            `${SSR_API_URL}/api/locations/resolve?${params.toString()}`,
            { next: { revalidate: 3600 } } // Кеширование на 1 час
        );

        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error resolving location:", error);
        return null;
    }
}

/** Новый API для иерархических локаций */
async function resolveLocationNew(
    slugs: string[]
): Promise<ResolvedLocationNew | null> {
    try {
        const res = await fetch(
            `${SSR_API_URL}/api/locations/resolve-new?slugs=${slugs.join(",")}`,
            { next: { revalidate: 3600 } }
        );

        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error resolving location (new):", error);
        return null;
    }
}

async function getListings(
    params: Record<string, string> = {}
): Promise<ListingsResponse> {
    try {
        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(params)) {
            if (!value) continue;
            if (key === "district_id") searchParams.set("district_id", value);
            else if (key === "settlement_id") searchParams.set("settlement_id", value);
            else if (key === "settlements") searchParams.set("settlements", value);
            else if (key === "location_id") searchParams.set("location_id", value); // Новый параметр
            else if (key === "land_use") searchParams.set("land_use_id", value);
            else searchParams.set(key, value);
        }

        if (!searchParams.has("size")) searchParams.set("size", "12");

        const res = await fetch(
            `${SSR_API_URL}/api/listings?${searchParams.toString()}`,
            { next: { revalidate: 60 } }
        );

        if (!res.ok) {
            return { items: [], total: 0, page: 1, size: 12, pages: 1 };
        }

        return res.json();
    } catch (error) {
        console.error("Error fetching listings:", error);
        return { items: [], total: 0, page: 1, size: 12, pages: 1 };
    }
}

async function getListingByGeoUrl(
    districtSlug: string,
    settlementSlug: string | null,
    listingSlug: string
): Promise<ListingData | null> {
    try {
        // Сначала пробуем получить по обычному slug
        const res = await fetch(
            `${SSR_API_URL}/api/listings/${listingSlug}`,
            { next: { revalidate: 60 } }
        );

        if (!res.ok) return null;

        const listing = await res.json();

        // Проверяем, что листинг соответствует гео-URL
        // (если указан settlement, он должен совпадать)
        if (listing.settlement?.district?.slug !== districtSlug) {
            return null;
        }

        if (settlementSlug && listing.settlement?.slug !== settlementSlug) {
            return null;
        }

        return listing;
    } catch (error) {
        console.error("Error fetching listing:", error);
        return null;
    }
}

// === Metadata ===

export async function generateMetadata({ params }: GeoPageProps): Promise<Metadata> {
    const { geo } = await params;
    const settings = await getSiteSettings();

    // Проверка на зарезервированные slug
    if (geo.length > 0 && RESERVED_SLUGS.includes(geo[0])) {
        return {};
    }

    const districtSlug = geo[0];
    const settlementSlug = geo.length >= 2 ? geo[1] : undefined;

    // Резолв локации
    const location = await resolveLocation(districtSlug, settlementSlug);

    if (!location || !location.district_id) {
        return { title: "Страница не найдена" };
    }

    // Определяем тип страницы
    if (geo.length === 3 || (geo.length === 2 && !location.settlement_id)) {
        // Это листинг
        const listingSlug = geo.length === 3 ? geo[2] : geo[1];
        const listing = await getListingByGeoUrl(
            districtSlug,
            geo.length === 3 ? settlementSlug! : null,
            listingSlug
        );

        if (listing) {
            const title = listing.meta_title || listing.title;
            const description = listing.meta_description || listing.description?.substring(0, 160);

            return {
                title,
                description,
                alternates: { canonical: `/${geo.join("/")}` },
                openGraph: {
                    type: "website",
                    url: `/${geo.join("/")}`,
                    title,
                    description: description || undefined,
                },
            };
        }
    }

    // Это каталог
    let title = settings.seo_catalog_title || "Каталог земельных участков";
    let description = settings.seo_catalog_description || "";

    if (location.settlement_name && location.settlement_type) {
        const settlementFull = formatSettlementName(location.settlement_name, location.settlement_type);
        title = `Участки в ${settlementFull} | РКК земля`;
        description = `Земельные участки в ${settlementFull}, ${location.district_name}`;
    } else if (location.district_name) {
        title = `Участки в ${location.district_name} | РКК земля`;
        description = `Земельные участки в ${location.district_name}`;
    }

    const canonicalPath = settlementSlug
        ? `/${districtSlug}/${settlementSlug}`
        : `/${districtSlug}`;

    return {
        title,
        description,
        alternates: { canonical: canonicalPath },
        openGraph: {
            type: "website",
            url: canonicalPath,
            title,
            description,
            images: settings.og_image ? [{ url: settings.og_image }] : undefined,
        },
    };
}

// === Page Component ===

export default async function GeoPage({ params, searchParams }: GeoPageProps) {
    const { geo } = await params;
    const urlParams = await searchParams;

    // Проверка на зарезервированные slug
    if (geo.length > 0 && RESERVED_SLUGS.includes(geo[0])) {
        notFound();
    }

    const districtSlug = geo[0];
    const secondSegment = geo.length >= 2 ? geo[1] : undefined;
    const thirdSegment = geo.length >= 3 ? geo[2] : undefined;

    // Резолв локации
    const location = await resolveLocation(districtSlug, secondSegment);

    if (!location || !location.district_id) {
        notFound();
    }

    // Определяем тип страницы
    // Если 3 сегмента — точно листинг
    // Если 2 сегмента и settlement не найден — возможно листинг
    if (thirdSegment) {
        // /{district}/{settlement}/{listing}
        const listing = await getListingByGeoUrl(districtSlug, secondSegment!, thirdSegment);
        if (!listing) notFound();

        // Рендерим страницу листинга
        // TODO: Подключить компонент ListingPage
        return <ListingPageContent listing={listing} geo={location} />;
    }

    if (secondSegment && !location.settlement_id) {
        // /{district}/{listing} — листинг без settlement
        const listing = await getListingByGeoUrl(districtSlug, null, secondSegment);
        if (listing) {
            return <ListingPageContent listing={listing} geo={location} />;
        }
        // Если не листинг — 404
        notFound();
    }

    // Это каталог
    const geoLocation: GeoLocation = {
        districtId: location.district_id || undefined,
        districtSlug: location.district_slug || undefined,
        districtName: location.district_name || undefined,
        settlementId: location.settlement_id || undefined,
        settlementSlug: location.settlement_slug || undefined,
        settlementName: location.settlement_name || undefined,
        settlementType: location.settlement_type || undefined,
    };

    // Формируем параметры для API
    const apiParams: Record<string, string> = { ...urlParams };
    if (location.settlement_id) {
        apiParams.settlement_id = location.settlement_id.toString();
    } else if (location.district_id) {
        apiParams.district_id = location.district_id.toString();
    }

    const initialData = await getListings(apiParams);
    const breadcrumbs = buildGeoBreadcrumbs(geoLocation);

    // Формируем заголовок
    let pageTitle = "Земельные участки";
    if (location.settlement_name && location.settlement_type) {
        pageTitle = `Участки в ${formatSettlementName(location.settlement_name, location.settlement_type)}`;
    } else if (location.district_name) {
        pageTitle = `Участки в ${location.district_name}`;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Breadcrumbs items={breadcrumbs} />
                <h1 className="text-3xl font-bold mb-8">{pageTitle}</h1>

                <CatalogContent
                    initialData={initialData}
                    geoLocation={geoLocation}
                />
            </div>
        </div>
    );
}

// === Компонент для страницы листинга ===

function ListingPageContent({
    listing,
    geo
}: {
    listing: ListingData;
    geo: ResolvedLocation;
}) {
    const geoLocation: GeoLocation = {
        districtId: geo.district_id || undefined,
        districtSlug: geo.district_slug || undefined,
        districtName: geo.district_name || undefined,
        settlementId: geo.settlement_id || undefined,
        settlementSlug: geo.settlement_slug || undefined,
        settlementName: geo.settlement_name || undefined,
        settlementType: geo.settlement_type || undefined,
    };

    const breadcrumbs = buildGeoBreadcrumbs(geoLocation, listing.title, listing.slug);

    // Schema.org Product/Offer
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "description": listing.description,
        "image": (listing as any).images?.map((img: any) => getImageUrl(img.thumbnail_url || img.url)) || [],
        "offers": {
            "@type": "Offer",
            "price": listing.price_min,
            "priceCurrency": "RUB",
            "availability": "https://schema.org/InStock",
            "url": `${SITE_URL}/${geoLocation.districtSlug}/${geoLocation.settlementSlug}/${listing.slug}`,
        }
    };

    return (
        <>
            <SeoJsonLd data={jsonLd} />
            <ListingContent
                listing={listing as any}
                breadcrumbs={breadcrumbs}
            />
        </>
    );
}

