import { Suspense } from "react";
import { Metadata } from "next";
import { MapPageContent } from "./MapPageContent";
import { getSiteSettings } from "@/lib/server-config";
import { SITE_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();

    const title = settings.seo_map_title || "Карта участков";
    const description = settings.seo_map_description || "Интерактивная карта земельных участков в Калининградской области.";

    return {
        title,
        description,
        alternates: {
            canonical: "/map",
        },
        openGraph: {
            url: "/map",
        },
    };
}

export default function MapPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="h-screen flex items-center justify-center">Загрузка...</div>}>
                <MapPageContent />
            </Suspense>
        </div>
    );
}
