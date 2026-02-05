import { Metadata } from "next";
import { CatalogContent } from "./CatalogContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SSR_API_URL, SITE_URL } from "@/lib/config";
import { buildLocationUrlForCanonical } from "@/lib/geoUrl";
import type { ListingData, ListingsResponse } from "@/types/listing";

// Реэкспорт для обратной совместимости
export type { ListingsResponse } from "@/types/listing";

interface CatalogPageProps {
    searchParams: Promise<Record<string, string>>;
}

/**
 * Получить данные локации для canonical URL.
 */
async function getLocationForCanonical(locationId: string): Promise<{
    slug: string;
    type: string;
    parent?: { slug: string } | null;
} | null> {
    try {
        const res = await fetch(`${SSR_API_URL}/api/locations/${locationId}`, {
            next: { revalidate: 3600 }, // Кеш на 1 час
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

/**
 * Серверная функция для получения листингов.
 * Аналогично getListing() в /listing/[slug]/page.tsx
 */
async function getListings(
    params: Record<string, string> = {}
): Promise<ListingsResponse> {
    try {
        const searchParams = new URLSearchParams();

        // Маппинг параметров URL → API
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
            { next: { revalidate: 60 } } // Кеширование на 60 секунд
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

interface MetadataProps {
    searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ searchParams }: MetadataProps): Promise<Metadata> {
    const settings = await getSiteSettings();
    const params = await searchParams;

    // Получаем номер страницы
    const page = parseInt(params.page || "1", 10);
    const pageNum = isNaN(page) || page < 1 ? 1 : page;

    // Базовый title и description
    let title = settings.seo_catalog_title || "Каталог земельных участков";
    const description = settings.seo_catalog_description || "Все земельные участки в Калининградской области. Фильтрация по районам, цене и площади.";

    // Добавляем суффикс страницы для страниц > 1
    if (pageNum > 1) {
        title = `${title} — страница ${pageNum}`;
    }

    // Определяем canonical URL
    let canonicalPath = "/catalog";

    // Если есть location_id — строим geo-URL для canonical
    if (params.location_id) {
        const location = await getLocationForCanonical(params.location_id);
        if (location) {
            canonicalPath = buildLocationUrlForCanonical(location);
        }
    }

    // Добавляем page к canonical для страниц > 1
    if (pageNum > 1) {
        canonicalPath = `${canonicalPath}?page=${pageNum}`;
    }

    // noindex для страниц с фильтрами (кроме page и location_id)
    const filterParams = Object.keys(params).filter(
        (key) => !["page", "location_id"].includes(key)
    );
    const hasFilters = filterParams.length > 0;

    return {
        title,
        description,
        // noindex для страниц с фильтрами — предотвращает индексацию мусорных URL
        robots: hasFilters ? { index: false, follow: true } : undefined,
        alternates: {
            canonical: `${SITE_URL}${canonicalPath}`,
        },
        openGraph: {
            type: "website",
            url: `${SITE_URL}${canonicalPath}`,
            title,
            description,
            images: settings.og_image ? [{ url: settings.og_image }] : undefined,
        },
    };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
    // Получаем параметры из URL
    const params = await searchParams;

    // Загружаем данные на сервере
    const initialData = await getListings(params);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Breadcrumbs items={[{ name: "Каталог", href: "/catalog" }]} />
                <h1 className="text-3xl font-bold mb-8">Каталог земельных участков</h1>

                <CatalogContent initialData={initialData} />
            </div>
        </div>
    );
}
