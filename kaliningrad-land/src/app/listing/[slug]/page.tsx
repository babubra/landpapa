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
    const listing = await getListing(slug);

    if (!listing) {
        return { title: "Объявление не найдено" };
    }

    // --- Auto-Generation Logic ---

    // 1. Формируем локацию
    const locationParts = [];
    if (listing.settlement?.district?.name) locationParts.push(listing.settlement.district.name);
    if (listing.settlement?.name) locationParts.push(listing.settlement.name);
    const locationStr = locationParts.join(", ");

    // 2. Title
    let title = listing.meta_title;
    if (!title) {
        // Автогенерация: Продажа участка {area} соток {district}, {settlement}, Калининградская область
        const areaStr = listing.plots[0]?.area ? (listing.plots[0].area / 100).toFixed(2).replace(".00", "") : "?";
        title = `Продажа участка ${areaStr} соток ${locationStr ? `${locationStr}, ` : ""}Калининградская область`;
    }

    // 3. Description
    let description = listing.meta_description;
    if (!description) {
        // Автогенерация: Земельный участок: {title}. {location}, Калининградская область.
        // Если title совпадал с автогенерацией, можно использовать listing.title
        const baseTitle = listing.title;
        description = `Земельный участок: ${baseTitle}. ${locationStr ? `${locationStr}, ` : ""}Калининградская область.`;
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
            <div className="container mx-auto px-4 py-8 max-w-6xl">
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
