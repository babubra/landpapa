import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogContent } from "../CatalogContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SSR_API_URL, getImageUrl } from "@/lib/config";
import { formatCompactPrice } from "@/lib/utils";
import type { ListingData } from "@/types/listing";
import type { ListingsResponse } from "../page";
import { ListingDetailView, ListingDetail } from "@/components/listing/ListingDetailView";

interface GeoData {
    type: "district" | "settlement";
    district_id: number;
    district_name: string;
    district_slug: string;
    settlement_id: number | null;
    settlement_name: string | null;
    settlement_slug: string | null;
    settlement_type: string | null;
}

interface GeoCatalogPageProps {
    params: Promise<{ geo: string[] }>;
    searchParams: Promise<Record<string, string>>;
}

/**
 * Получить гео-данные по slug.
 */
async function getGeoData(geoSegments: string[]): Promise<GeoData | null> {
    try {
        let endpoint: string;
        if (geoSegments.length === 1) {
            endpoint = `${SSR_API_URL}/api/locations/geo/by-slug/${geoSegments[0]}`;
        } else if (geoSegments.length === 2) {
            endpoint = `${SSR_API_URL}/api/locations/geo/by-slug/${geoSegments[0]}/${geoSegments[1]}`;
        } else {
            return null;
        }

        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return null;

        const data = await res.json();
        return data || null;
    } catch {
        return null;
    }
}

/**
 * Получить объявление по slug.
 */
async function getListing(slug: string): Promise<ListingDetail | null> {
    try {
        const res = await fetch(`${SSR_API_URL}/api/listings/${slug}`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

/**
 * Серверная функция для получения листингов с гео-фильтром.
 */
async function getListings(
    params: Record<string, string> = {},
    geoData: GeoData | null
): Promise<ListingsResponse> {
    try {
        const searchParams = new URLSearchParams();

        // Добавляем гео-фильтр
        if (geoData) {
            if (geoData.type === "settlement" && geoData.settlement_id) {
                searchParams.set("settlement_id", geoData.settlement_id.toString());
            } else if (geoData.type === "district") {
                searchParams.set("district_id", geoData.district_id.toString());
            }
        }

        // Маппинг остальных параметров URL → API
        for (const [key, value] of Object.entries(params)) {
            if (!value) continue;
            if (key === "district") searchParams.set("district_id", value);
            else if (key === "settlement") searchParams.set("settlement_id", value);
            else if (key === "settlements") searchParams.set("settlements", value);
            else if (key === "land_use") searchParams.set("land_use_id", value);
            else searchParams.set(key, value);
        }

        // Размер страницы по умолчанию
        if (!searchParams.has("size")) searchParams.set("size", "12");

        const res = await fetch(
            `${SSR_API_URL}/api/listings?${searchParams.toString()}`,
            { next: { revalidate: 60 } }
        );

        if (!res.ok) {
            console.error(`Failed to fetch listings: ${res.status}`);
            return { items: [], total: 0, page: 1, size: 12, pages: 1 };
        }

        return res.json();
    } catch (error) {
        console.error("Error fetching listings:", error);
        return { items: [], total: 0, page: 1, size: 12, pages: 1 };
    }
}

/**
 * Формирует название локации для отображения.
 */
function formatLocationName(geoData: GeoData): string {
    if (geoData.type === "settlement" && geoData.settlement_name) {
        // Формируем: "пос. Каменка", "г. Калининград"
        const prefix = geoData.settlement_type ? `${geoData.settlement_type}. ` : "";
        return `${prefix}${geoData.settlement_name}`;
    }
    return geoData.district_name;
}

/**
 * Формирует H1 заголовок.
 */
function formatH1(geoData: GeoData): string {
    const locationName = formatLocationName(geoData);

    // Для Калининграда используем "в Калининграде"
    if (geoData.district_slug === "kaliningrad" && geoData.type === "district") {
        return "Участки в Калининграде";
    }

    // Для посёлков: "Участки в пос. Каменка"
    if (geoData.type === "settlement") {
        return `Участки в ${locationName}`;
    }

    // Для районов: "Участки в Гурьевском районе"
    return `Участки в ${geoData.district_name}`;
}

/**
 * Формирует URL страницы.
 */
function formatPageUrl(geoData: GeoData): string {
    if (geoData.type === "settlement" && geoData.settlement_slug) {
        return `/catalog/${geoData.district_slug}/${geoData.settlement_slug}/`;
    }
    return `/catalog/${geoData.district_slug}/`;
}

export async function generateMetadata({
    params,
}: GeoCatalogPageProps): Promise<Metadata> {
    const { geo } = await params;

    // 1. Проверяем, является ли это страницей листинга (3 сегмента)
    if (geo.length === 3) {
        const listingSlug = geo[2];
        const listing = await getListing(listingSlug);

        if (listing) {
            // Формируем локацию
            const locationParts = [];
            if (listing.settlement?.district?.name) locationParts.push(listing.settlement.district.name);
            if (listing.settlement?.name) locationParts.push(listing.settlement.name);
            const locationStr = locationParts.join(", ");

            // Title
            let title = listing.meta_title;
            if (!title) {
                const plotsCount = listing.plots?.length || 0;
                const isMultiple = plotsCount > 1;

                // Новая формула (кратко): Участок {S} сот. в {Локация}, {Цена} | РКК земля

                // 1. Площадь
                const firstArea = listing.plots[0]?.area ? (listing.plots[0].area / 100).toFixed(2).replace(".00", "") : null;
                let areaStr = firstArea ? `${firstArea} сот.` : "";
                if (isMultiple && firstArea) areaStr = `от ${firstArea} сот.`;

                // 2. Локация
                let locationShort = "";
                if (listing.settlement) {
                    const typePrefix = listing.settlement.type ? `${listing.settlement.type}. ` : "";
                    locationShort = `в ${typePrefix}${listing.settlement.name}`;
                }

                // 3. Цена
                const priceStr = listing.price_min ? formatCompactPrice(listing.price_min) : "";

                // Сборка
                const typeStr = isMultiple ? "Участки" : "Участок";
                const mainPart = `${typeStr} ${areaStr} ${locationShort}`.trim().replace(/\s+/g, " ");

                title = `${mainPart}${priceStr ? `, ${priceStr}` : ""}`;
            }

            // Description
            let description = listing.meta_description;
            if (!description) {
                const baseTitle = listing.title;
                description = `Земельный участок: ${baseTitle}. ${locationStr ? `${locationStr}, ` : ""}Калининградская область.`;
            }

            const ogImages = [];
            if (listing.images && listing.images.length > 0) {
                const img = listing.images[0];
                const rawUrl = img.thumbnail_url || img.url;
                ogImages.push(getImageUrl(rawUrl));
            }

            const pageUrl = `/catalog/${geo[0]}/${geo[1]}/${listing.slug}`;

            return {
                title,
                description,
                openGraph: {
                    type: "website",
                    url: pageUrl,
                    title,
                    description,
                    images: ogImages,
                },
                alternates: {
                    canonical: pageUrl,
                },
            };
        }
    }

    const geoData = await getGeoData(geo);
    const settings = await getSiteSettings();

    if (!geoData) {
        return { title: "Страница не найдена" };
    }

    const h1 = formatH1(geoData);

    // Формула каталога: Участки в {Локация} от {Мин.Площадь} | РКК земля
    // Здесь нет данных о мин.площади у нас в geoData. Пока оставим просто "Участки в {Локация} | РКК земля"
    // Или можно хардкодить "от 6 сот.", но это неправда.
    // Пользователь просил: "Участки в Гурьевском р-не от 6 сот. | РКК земля"
    // Без реальных данных лучше не писать "от 6 сот.".
    // Но можно написать просто "Участки в {Локация} | РКК земля"

    let locationName = "";
    if (geoData.type === "settlement" && geoData.settlement_name) {
        locationName = `пос. ${geoData.settlement_name}`; // с "пос."
    } else {
        locationName = geoData.district_name.replace(" район", " р-не");
    }

    // Если Settlement - добавляем "в"
    // Пример: "Участки в Воробьево"
    // Если District - "Участки в Гурьевском р-не"

    const titleLoc = geoData.type === "settlement" ? `в ${locationName}` : `в ${locationName}`;

    // TODO: Если в будущем будут данные о мин площади/цене в этом районе, добавить сюда.
    const title = `Участки ${titleLoc}`;

    const description = geoData.type === "settlement"
        ? `Земельные участки в ${formatLocationName(geoData)}, ${geoData.district_name}, Калининградская область. Актуальные предложения с ценами.`
        : `Земельные участки в ${geoData.district_name}, Калининградская область. Каталог участков с ценами и фото.`;

    const pageUrl = formatPageUrl(geoData);

    return {
        title,
        description,
        alternates: {
            canonical: pageUrl,
        },
        openGraph: {
            type: "website",
            url: pageUrl,
            title,
            description,
            images: settings.og_image ? [{ url: settings.og_image }] : undefined,
        },
    };
}

export default async function GeoCatalogPage({ params, searchParams }: GeoCatalogPageProps) {
    const { geo } = await params;
    const urlParams = await searchParams;

    // 1. Проверяем, является ли это страницей листинга (3 сегмента)
    if (geo.length === 3) {
        const [districtSlug, settlementSlug, listingSlug] = geo;

        // Загружаем листинг и настройки параллельно
        const [listing, settings] = await Promise.all([
            getListing(listingSlug),
            getSiteSettings()
        ]);

        if (listing) {
            // Здесь можно добавить проверку соответствия geoURL с данными листинга
            // Например: if (listing.settlement?.slug !== settlementSlug) ...
            // Пока просто отображаем листинг

            return (
                <ListingDetailView
                    listing={listing}
                    settings={settings}
                    geoParams={{
                        districtSlug,
                        settlementSlug
                    }}
                />
            );
        }
        // Если листинг не найден, идём дальше (будет 404 в getGeoData или ниже)
    }

    // Получаем гео-данные
    const geoData = await getGeoData(geo);

    if (!geoData) {
        notFound();
    }

    // Загружаем данные на сервере
    const initialData = await getListings(urlParams, geoData);

    // Формируем H1 и breadcrumbs
    const h1 = formatH1(geoData);
    const pageUrl = formatPageUrl(geoData);

    // Breadcrumbs
    const breadcrumbItems = [
        { name: "Каталог", href: "/catalog" },
    ];

    // Добавляем район
    breadcrumbItems.push({
        name: geoData.district_name,
        href: `/catalog/${geoData.district_slug}/`,
    });

    // Если это посёлок — добавляем его
    if (geoData.type === "settlement" && geoData.settlement_name) {
        breadcrumbItems.push({
            name: formatLocationName(geoData),
            href: pageUrl,
        });
    }

    // Контекст гео-фильтра для CatalogContent
    const geoContext = {
        districtId: geoData.district_id,
        districtSlug: geoData.district_slug,
        districtName: geoData.district_name,
        settlementId: geoData.settlement_id,
        settlementSlug: geoData.settlement_slug,
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Breadcrumbs items={breadcrumbItems} />
                <h1 className="text-3xl font-bold mb-8">{h1}</h1>

                <CatalogContent
                    initialData={initialData}
                    baseUrl={pageUrl}
                    geoContext={geoContext}
                />
            </div>
        </div>
    );
}
