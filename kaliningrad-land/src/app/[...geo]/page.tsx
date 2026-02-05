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
import { buildHierarchyBreadcrumbs, formatSettlementName, type HierarchyLocation } from "@/lib/geoUrl";
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
        name_locative: string | null;  // SEO: "в Калининграде"
        description: string | null;    // SEO: описание локации
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

        const listing: ListingData = await res.json();

        // 1. Проверка по новой иерархии (location)
        if (listing.location) {
            // Если в URL передан поселок (2 сегмента пути перед slug)
            if (settlementSlug) {
                // Ожидаем, что локация - settlement, slug совпадает, и parent совпадает
                const isMatch =
                    listing.location.slug === settlementSlug &&
                    listing.location.parent?.slug === districtSlug;

                if (isMatch) return listing;
            } else {
                // Если в URL только район/город (1 сегмент пути перед slug)
                // Ожидаем, что локация совпадает с districtSlug
                if (listing.location.slug === districtSlug) return listing;
            }

            // Если новая локация есть, но URL не совпал - возможно, стоит проверить старые поля (fallback)?
            // Но если мы перешли на новые, лучше строго следовать им.
            // Однако, для плавности миграции можно оставить проверку старых полей ниже.
        }

        // 2. Старая проверка (fallback для объявлений без location или если миграция частичная)
        // Проверяем, что листинг соответствует гео-URL
        // (если указан settlement, он должен совпадать)
        if (listing.settlement?.district?.slug !== districtSlug) {
            // Если есть location, и мы уже проверили выше, что он не совпал - это точно несовпадение.
            // Но если location нет, проверяем старые поля.
            if (listing.location) return null; // У жесткой новой логики приоритет
            return null;
        }

        if (settlementSlug && listing.settlement?.slug !== settlementSlug) {
            if (listing.location) return null;
            return null;
        }

        return listing;
    } catch (error) {
        console.error("Error fetching listing:", error);
        return null;
    }
}

// === Metadata ===

export async function generateMetadata({ params, searchParams }: GeoPageProps): Promise<Metadata> {
    const { geo } = await params;
    const queryParams = await searchParams;
    const settings = await getSiteSettings();

    // Получаем номер страницы
    const page = parseInt(queryParams.page || "1", 10);
    const pageNum = isNaN(page) || page < 1 ? 1 : page;

    // Проверка на зарезервированные slug
    if (geo.length > 0 && RESERVED_SLUGS.includes(geo[0])) {
        return {};
    }

    const districtSlug = geo[0];
    const settlementSlug = geo.length >= 2 ? geo[1] : undefined;

    // Резолв локации через новый и старый API
    const locationNew = await resolveLocationNew(geo);
    const location = await resolveLocation(districtSlug, settlementSlug);

    if (!locationNew?.leaf_id && (!location || !location.district_id)) {
        return { title: "Страница не найдена" };
    }

    // Получаем slugs из новой иерархии для canonical
    const locations = locationNew?.locations || [];
    const leafLocation = locations.length > 0 ? locations[locations.length - 1] : null;
    const parentLocation = locations.length > 1 ? locations[locations.length - 2] : null;

    // Определяем тип страницы
    if (geo.length === 3 || (geo.length === 2 && !location?.settlement_id)) {
        // Это листинг
        const listingSlug = geo.length === 3 ? geo[2] : geo[1];
        const listing = await getListingByGeoUrl(
            districtSlug,
            geo.length === 3 ? settlementSlug! : null,
            listingSlug
        );

        if (listing) {
            // === Подготовка переменных для шаблона ===
            const priceMin = listing.price_min;
            const priceStr = priceMin ? `${priceMin.toLocaleString("ru-RU")} ₽` : "";

            const areaNum = listing.total_area ?? listing.area_min;
            let areaStr = "";
            if (areaNum) {
                if (areaNum >= 10000) {
                    areaStr = `${(areaNum / 10000).toFixed(1)} га`;
                } else {
                    areaStr = `${(areaNum / 100).toFixed(1)} сот.`;
                }
            }

            // Локация
            const locationStr = listing.location?.name_locative || "";

            // Кадастровый номер
            const cadastralStr = listing.plots?.[0]?.cadastral_number || "";

            // Назначение
            const purposeStr = listing.plots?.[0]?.purpose?.name || "";

            // === Генерация Title ===
            let title = listing.meta_title;
            if (!title) {
                const titleTemplate = settings.seo_listing_title_template;
                if (titleTemplate) {
                    title = titleTemplate
                        .replace(/\{title\}/g, listing.title || "Участок")
                        .replace(/\{price\}/g, priceStr)
                        .replace(/\{area\}/g, areaStr)
                        .replace(/\{location\}/g, locationStr)
                        .replace(/\{cadastral\}/g, cadastralStr)
                        .replace(/\{purpose\}/g, purposeStr);
                } else {
                    title = listing.title;
                }
            }

            // === Генерация Description ===
            let description = listing.meta_description;
            if (!description) {
                const descTemplate = settings.seo_listing_description_template;
                if (descTemplate) {
                    description = descTemplate
                        .replace(/\{title\}/g, listing.title || "Участок")
                        .replace(/\{price\}/g, priceStr)
                        .replace(/\{area\}/g, areaStr)
                        .replace(/\{location\}/g, locationStr)
                        .replace(/\{cadastral\}/g, cadastralStr)
                        .replace(/\{purpose\}/g, purposeStr);
                } else {
                    description = listing.description?.substring(0, 160);
                }
            }

            // Canonical для листинга: используем slugs из новой иерархии
            let canonicalPath = `/${geo.join("/")}`;
            if (leafLocation && parentLocation) {
                // settlement с parent
                canonicalPath = `/${parentLocation.slug}/${leafLocation.slug}/${listingSlug}`;
            } else if (leafLocation) {
                // district/city
                canonicalPath = `/${leafLocation.slug}/${listingSlug}`;
            }

            return {
                title,
                description,
                alternates: { canonical: canonicalPath },
                openGraph: {
                    type: "website",
                    url: canonicalPath,
                    title,
                    description: description || undefined,
                },
            };
        }
    }

    // Это каталог
    let title = settings.seo_catalog_title || "Каталог земельных участков";
    let description = settings.seo_catalog_description || "";

    // Используем данные из новой иерархии если доступны, иначе fallback
    const nameLocative = leafLocation?.name_locative;  // SEO: "в Калининграде"
    const displayName = leafLocation?.name || location?.settlement_name || location?.district_name;
    const displayType = leafLocation?.settlement_type || location?.settlement_type;
    const parentName = parentLocation?.name || location?.district_name;

    // Формируем переменные для шаблонов
    let locationVar = "";  // {location} — "в Калининграде"
    let locationNameVar = "";  // {location_name} — "Калининград"

    if (nameLocative) {
        locationVar = nameLocative;
        locationNameVar = displayName || "";
    } else if (displayName && displayType) {
        locationVar = `в ${formatSettlementName(displayName, displayType)}`;
        locationNameVar = displayName;
    } else if (displayName) {
        locationVar = `в ${displayName}`;
        locationNameVar = displayName;
    }

    // Применяем шаблоны если есть location
    if (locationVar) {
        // Title
        const titleTemplate = settings.seo_geo_title_template || "Участки {location} | РКК земля";
        title = titleTemplate
            .replace(/\{location\}/g, locationVar)
            .replace(/\{location_name\}/g, locationNameVar);

        // Description
        const descTemplate = settings.seo_geo_description_template ||
            "Земельные участки {location}. Актуальные предложения по продаже земли.";
        description = descTemplate
            .replace(/\{location\}/g, locationVar)
            .replace(/\{location_name\}/g, locationNameVar);
    }

    // Canonical из новой иерархии
    let canonicalPath: string;
    if (leafLocation && parentLocation) {
        // settlement с parent (district)
        canonicalPath = `/${parentLocation.slug}/${leafLocation.slug}`;
    } else if (leafLocation) {
        // district/city без parent в URL
        canonicalPath = `/${leafLocation.slug}`;
    } else {
        // Fallback на URL params
        canonicalPath = settlementSlug
            ? `/${districtSlug}/${settlementSlug}`
            : `/${districtSlug}`;
    }

    // Добавляем суффикс страницы для title на страницах > 1
    if (pageNum > 1) {
        title = `${title} — страница ${pageNum}`;
        canonicalPath = `${canonicalPath}?page=${pageNum}`;
    }

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

    // Резолв локации через новый API (работает с city, district, settlement)
    const locationNew = await resolveLocationNew(geo);

    // Fallback на старый API для обратной совместимости
    const locationOld = await resolveLocation(districtSlug, secondSegment);

    // Проверяем что хотя бы один API нашёл локацию
    if (!locationNew?.leaf_id && !locationOld?.district_id) {
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
        return <ListingPageContent listing={listing} geo={locationOld!} locationNew={locationNew} />;
    }

    if (secondSegment && !locationOld?.settlement_id) {
        // /{district}/{listing} — листинг без settlement
        const listing = await getListingByGeoUrl(districtSlug, null, secondSegment);
        if (listing) {
            return <ListingPageContent listing={listing} geo={locationOld!} locationNew={locationNew} />;
        }
        // Если не листинг — 404
        notFound();
    }

    // Это каталог — формируем geoLocation из доступных данных
    const locations = locationNew?.locations || [];
    const leafLocation = locations.length > 0 ? locations[locations.length - 1] : null;
    const parentLocation = locations.length > 1
        ? locations[locations.length - 2]
        : null;



    // Формируем параметры для API
    const apiParams: Record<string, string> = { ...urlParams };

    // Приоритет: location_id (новая иерархия) > settlement_id > district_id
    if (locationNew?.leaf_id) {
        apiParams.location_id = locationNew.leaf_id.toString();
    } else if (locationOld?.settlement_id) {
        apiParams.settlement_id = locationOld.settlement_id.toString();
    } else if (locationOld?.district_id) {
        apiParams.district_id = locationOld.district_id.toString();
    }

    const initialData = await getListings(apiParams);

    // Конвертируем locations в HierarchyLocation[] для breadcrumbs
    const hierarchyLocations: HierarchyLocation[] = locations.map(loc => ({
        ...loc,
        type: loc.type as HierarchyLocation["type"],
        listings_count: 0,
        children: [],
    }));
    const breadcrumbs = buildHierarchyBreadcrumbs(hierarchyLocations);

    // Формируем заголовок с использованием шаблона
    const settings = await getSiteSettings();
    const nameLocative = leafLocation?.name_locative;  // SEO: "в Калининграде"
    const displayName = leafLocation?.name || locationOld?.settlement_name || locationOld?.district_name;
    const displayType = leafLocation?.settlement_type || locationOld?.settlement_type;

    // Формируем переменные для шаблона H1
    let locationVar = "";  // {location} — "в Калининграде"
    let locationNameVar = "";  // {location_name} — "Калининград"

    if (nameLocative) {
        locationVar = nameLocative;
        locationNameVar = displayName || "";
    } else if (displayName && displayType) {
        locationVar = `в ${formatSettlementName(displayName, displayType)}`;
        locationNameVar = displayName;
    } else if (displayName) {
        locationVar = `в ${displayName}`;
        locationNameVar = displayName;
    }

    // Применяем шаблон H1
    let pageTitle = "Земельные участки";
    if (locationVar) {
        const h1Template = settings.seo_geo_h1_template || "Участки {location}";
        pageTitle = h1Template
            .replace(/\{location\}/g, locationVar)
            .replace(/\{location_name\}/g, locationNameVar);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Breadcrumbs items={breadcrumbs} />
                <h1 className="text-3xl font-bold mb-4">{pageTitle}</h1>
                {leafLocation?.description && (
                    <p className="text-muted-foreground mb-8 max-w-3xl">
                        {leafLocation.description}
                    </p>
                )}

                <CatalogContent
                    initialData={initialData}
                    locationId={locationNew?.leaf_id ?? undefined}
                    baseUrl={`/${geo.join('/')}`}
                />
            </div>
        </div>
    );
}

// === Компонент для страницы листинга ===

function ListingPageContent({
    listing,
    geo,
    locationNew
}: {
    listing: ListingData;
    geo: ResolvedLocation;
    locationNew: ResolvedLocationNew | null;
}) {
    // Получаем локации из новой иерархии
    const locations = locationNew?.locations || [];

    // Конвертируем locations в HierarchyLocation[] для breadcrumbs
    const hierarchyLocations: HierarchyLocation[] = locations.map(loc => ({
        ...loc,
        type: loc.type as HierarchyLocation["type"],
        listings_count: 0,
        children: [],
    }));
    const breadcrumbs = buildHierarchyBreadcrumbs(hierarchyLocations, listing.title, listing.slug);

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
            "url": `${SITE_URL}/${locations.map(l => l.slug).join('/')}/${listing.slug}`,
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

