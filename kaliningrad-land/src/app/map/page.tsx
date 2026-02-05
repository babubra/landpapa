import { Suspense } from "react";
import { Metadata } from "next";
import { MapPageContent } from "./MapPageContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getSiteSettings } from "@/lib/server-config";
import { SITE_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();

    const title = settings.seo_map_title || "Карта участков";
    const description = settings.seo_map_description || "Интерактивная карта земельных участков в Калининградской области.";

    return {
        title,
        description,
        // noindex — карта это интерактивный инструмент, не SEO-страница
        robots: { index: false, follow: true },
        alternates: {
            canonical: "/map",
        },
        openGraph: {
            type: "website",
            url: "/map",
            title,
            description,
            images: settings.og_image ? [{ url: settings.og_image }] : undefined,
        },
    };
}

export default function MapPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* JSON-LD разметка BreadcrumbList для SEO (без визуальной навигации) */}
            <Breadcrumbs items={[{ name: "Карта участков", href: "/map" }]} visuallyHidden />

            <Suspense fallback={<div className="h-screen flex items-center justify-center">Загрузка...</div>}>
                <MapPageContent />
            </Suspense>
        </div>
    );
}

