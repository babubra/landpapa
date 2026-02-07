/**
 * Страница для генерации скриншота карты объявления.
 * Используется Playwright для автоматической генерации изображений.
 * 
 * URL: /listing-screenshot/{slug}
 * 
 * Контейнер использует position:fixed для наложения поверх header/footer.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SSR_API_URL } from "@/lib/config";
import { ScreenshotMapClient } from "./ScreenshotMapClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Отключаем индексацию
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

interface PlotForMap {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
    status: string;
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

interface ListingData {
    id: number;
    slug: string;
    title: string;
    plots?: PlotForMap[];
}

async function getListing(slug: string): Promise<ListingData | null> {
    try {
        const res = await fetch(
            `${SSR_API_URL}/api/listings/${slug}`,
            { cache: "no-store" }
        );
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error fetching listing:", error);
        return null;
    }
}

export default async function ScreenshotPage({ params }: PageProps) {
    const { slug } = await params;
    const listing = await getListing(slug);

    if (!listing || !listing.plots || listing.plots.length === 0) {
        notFound();
    }

    // Преобразуем plots для карты
    const plots: PlotForMap[] = listing.plots.map((plot) => ({
        id: plot.id,
        cadastral_number: plot.cadastral_number,
        area: plot.area,
        price_public: plot.price_public,
        status: plot.status || "active",
        latitude: plot.latitude,
        longitude: plot.longitude,
        polygon: plot.polygon,
    }));

    return (
        <>
            {/* Контейнер с position:fixed накрывает весь экран поверх header/footer */}
            <div
                id="screenshot-container"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "1200px",
                    height: "630px",
                    zIndex: 99999,
                    background: "#f5f5f5",
                    overflow: "hidden",
                }}
            >
                <ScreenshotMapClient plots={plots} />
            </div>
        </>
    );
}
