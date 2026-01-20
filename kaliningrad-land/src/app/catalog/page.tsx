import { Metadata } from "next";
import { CatalogContent } from "./CatalogContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SSR_API_URL } from "@/lib/config";
import type { ListingData } from "@/types/listing";

// Типы для ответа API
export interface ListingsResponse {
    items: ListingData[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

interface CatalogPageProps {
    searchParams: Promise<Record<string, string>>;
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

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();

    const title = settings.seo_catalog_title || "Каталог земельных участков";
    const description = settings.seo_catalog_description || "Все земельные участки в Калининградской области. Фильтрация по районам, цене и площади.";

    return {
        title,
        description,
        alternates: {
            canonical: "/catalog",
        },
        openGraph: {
            type: "website",
            url: "/catalog",
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
