import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingSidebar } from "@/components/listing/ListingSidebar";
import { ListingMapClient } from "@/components/listing/ListingMapClient";
import { BackButton } from "@/components/ui/back-button";
import { SSR_API_URL } from "@/lib/config";

interface ListingPageProps {
    params: Promise<{ slug: string }>;
}

interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    address: string | null;
    price_public: number | null;
    status: string;
    land_use: { name: string } | null;
    land_category: { name: string } | null;
    purpose?: { name: string } | null;  // Назначение (ИЖС, СНТ и т.д.)
    // Геоданные
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

interface Realtor {
    phone: string;
}

interface Settlement {
    name: string;
    district?: { name: string };
}

interface ImageType {
    url: string;
    thumbnail_url: string | null;
}

interface ListingLocation {
    id: number;
    name: string;
    slug: string;
    type: string;
    settlement_type: string | null;
    name_locative: string | null;
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
    location?: ListingLocation | null;  // Новая иерархия локаций
    plots: Plot[];
    images: ImageType[];
    meta_title: string | null;
    meta_description: string | null;
}

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

import { getImageUrl, SITE_URL, getSiteSettings } from "@/lib/config";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

// ... (existing imports)

export async function generateMetadata({
    params,
}: ListingPageProps): Promise<Metadata> {
    const { slug } = await params;
    const [listing, settings] = await Promise.all([
        getListing(slug),
        getSiteSettings()
    ]);

    if (!listing) {
        return { title: "Объявление не найдено" };
    }

    // --- Подготовка переменных для шаблонов ---

    // Локация
    const locationParts = [];
    if (listing.location?.name) {
        // Новая иерархия
        const loc = listing.location;
        if (loc.name_locative) {
            locationParts.push(loc.name_locative);
        } else if (loc.settlement_type) {
            locationParts.push(`в ${loc.name}`);
        } else {
            locationParts.push(loc.name);
        }
    } else if (listing.settlement?.name) {
        // Fallback на старую систему
        locationParts.push(listing.settlement.name);
        if (listing.settlement.district?.name) {
            locationParts.push(listing.settlement.district.name);
        }
    }
    const locationStr = locationParts.length > 0 ? locationParts[0] : "";
    const locationFull = locationParts.join(", ");

    // Площадь
    const plotsCount = listing.plots?.length || 0;
    const isMultiple = plotsCount > 1;
    const firstArea = listing.plots?.[0]?.area ? (listing.plots[0].area / 100).toFixed(2).replace(".00", "") : null;
    const areaStr = firstArea
        ? (isMultiple ? `от ${firstArea} сот.` : `${firstArea} сот.`)
        : "";

    // Цена
    const formatPrice = (price: number) => new Intl.NumberFormat("ru-RU").format(price) + " ₽";
    const priceValue = listing.price_min;
    const priceStr = priceValue
        ? (isMultiple ? `от ${formatPrice(priceValue)}` : formatPrice(priceValue))
        : "";

    // Кадастровые номера
    const cadastralNumbers = listing.plots
        ?.map(p => p.cadastral_number)
        .filter((cn): cn is string => !!cn) || [];
    let cadastralStr = "";
    if (cadastralNumbers.length === 1) {
        cadastralStr = cadastralNumbers[0];
    } else if (cadastralNumbers.length === 2) {
        cadastralStr = cadastralNumbers.slice(0, 2).join(", ");
    } else if (cadastralNumbers.length > 2) {
        cadastralStr = cadastralNumbers.slice(0, 2).join(", ") + "...";
    }

    // Назначение
    const purposeStr = listing.plots?.[0]?.purpose?.name || "";

    // --- Генерация Title ---
    let title = listing.meta_title;
    if (!title) {
        const titleTemplate = settings.seo_listing_title_template;
        if (titleTemplate) {
            // Применяем шаблон
            title = titleTemplate
                .replace(/\{title\}/g, listing.title || "Участок")
                .replace(/\{price\}/g, priceStr)
                .replace(/\{area\}/g, areaStr)
                .replace(/\{location\}/g, locationStr)
                .replace(/\{cadastral\}/g, cadastralStr)
                .replace(/\{purpose\}/g, purposeStr);
        } else {
            // Fallback на старую логику
            const titleParts = ["Участок"];
            if (areaStr) titleParts.push(areaStr);
            if (priceStr) titleParts.push(priceStr);
            if (cadastralStr) titleParts.push(cadastralStr);
            if (locationFull) titleParts.push(locationFull);
            title = titleParts.join(" | ");
        }
    }

    // --- Генерация Description ---
    let description = listing.meta_description;
    if (!description) {
        const descTemplate = settings.seo_listing_description_template;
        if (descTemplate) {
            // Применяем шаблон
            description = descTemplate
                .replace(/\{title\}/g, listing.title || "Участок")
                .replace(/\{price\}/g, priceStr)
                .replace(/\{area\}/g, areaStr)
                .replace(/\{location\}/g, locationStr)
                .replace(/\{cadastral\}/g, cadastralStr)
                .replace(/\{purpose\}/g, purposeStr);
        } else {
            // Fallback на старую логику
            description = `Земельный участок: ${listing.title}. ${locationFull ? `${locationFull}, ` : ""}Калининградская область.`;
        }
    }

    const ogImages = [];
    if (listing.images && listing.images.length > 0) {
        const img = listing.images[0];
        const rawUrl = img.thumbnail_url || img.url;
        ogImages.push(getImageUrl(rawUrl));
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
            url: `/listing/${slug}`,
            images: ogImages,
        },
        alternates: {
            canonical: `/listing/${slug}`,
        },
    };
}

import { ListingProvider } from "@/context/ListingContext";

export default async function ListingPage({ params }: ListingPageProps) {
    const { slug } = await params;
    const [listing, settings] = await Promise.all([
        getListing(slug),
        getSiteSettings()
    ]);

    if (!listing) {
        notFound();
    }

    // Schema.org Product/Offer
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "description": listing.description,
        "image": listing.images.map(img => getImageUrl(img.thumbnail_url || img.url)),
        "offers": {
            "@type": "Offer",
            "price": listing.price_min, // Используем мин цену
            "priceCurrency": "RUB",
            "availability": "https://schema.org/InStock",
            "url": `${SITE_URL}/listing/${slug}`,
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

    // Формируем заголовок для UI и ALT-тегов (с регионом)
    const displayTitle = listing.title.toLowerCase().includes("калининград")
        ? listing.title
        : `${listing.title}, Калининградская область`;

    return (
        <div className="min-h-screen bg-background">
            <SeoJsonLd data={jsonLd} />
            <ListingProvider>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Хлебные крошки */}
                    <Breadcrumbs items={[
                        { name: "Каталог", href: "/catalog" },
                        { name: listing.title, href: `/listing/${slug}` }
                    ]} />

                    {/* Заголовок */}
                    <h1 className="text-3xl font-bold mb-8">{displayTitle}</h1>

                    {/* Основной контент */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Левая колонка: галерея + описание */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Галерея */}
                            <ListingGallery
                                images={listing.images}
                                title={displayTitle}
                                placeholderImage={getImageUrl(settings.placeholder_image)}
                            />

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

                            {/* Карта */}
                            <div>
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
            </ListingProvider>
        </div>
    );
}
