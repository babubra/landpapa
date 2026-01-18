import { Suspense } from "react";
import { Metadata } from "next";
import { CatalogContent } from "./CatalogContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SITE_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();

    const title = settings.seo_catalog_title || "Каталог земельных участков";
    const description = settings.seo_catalog_description || "Все земельные участки в Калининградской области. Фильтрация по районам, цене и площади.";

    return {
        title,
        description,
        alternates: {
            canonical: `${SITE_URL}/catalog`,
        },
    };
}

export default function CatalogPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Breadcrumbs items={[{ name: "Каталог", href: "/catalog" }]} />
                <h1 className="text-3xl font-bold mb-8">Каталог земельных участков</h1>

                <Suspense fallback={<div>Загрузка...</div>}>
                    <CatalogContent />
                </Suspense>
            </div>
        </div>
    );
}
