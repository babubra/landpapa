"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ListingData } from "@/types/listing";
import { usePlaceholderImage } from "@/contexts/SiteSettingsContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ru-RU").format(price);
}

function formatArea(areaM2: number): string {
    const sotki = areaM2 / 100;
    return sotki.toFixed(1);
}

function formatPriceRange(min: number | null, max: number | null): string {
    if (!min && !max) return "Цена по запросу";
    if (min === max || !max) return `${formatPrice(min!)} ₽`;
    return `от ${formatPrice(min!)} ₽`;
}

function getImageUrl(url: string | null | undefined, fallback: string): string {
    if (!url) return fallback;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
}

export interface ListingCardProps {
    listing: ListingData;
    variant?: "default" | "compact";
}

export function ListingCard({ listing, variant = "default" }: ListingCardProps) {
    const placeholderImage = usePlaceholderImage();

    // Получаем URL изображения (поддержка обоих полей)
    const imgData = listing.image || listing.main_image;
    const imageUrl = imgData ? (imgData.thumbnail_url || imgData.url) : null;

    const locationText = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : "Калининградская область";

    if (variant === "compact") {
        return (
            <Card className="overflow-hidden group hover:shadow-lg transition-shadow pt-0 gap-3">
                {/* Изображение */}
                <div className="relative h-48 overflow-hidden bg-muted">
                    <Image
                        src={getImageUrl(imageUrl, placeholderImage)}
                        alt={listing.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                    />
                    {listing.plots_count > 1 && (
                        <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                            {listing.plots_count} участка
                        </div>
                    )}
                </div>

                <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title}</h3>

                    <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>{locationText}</span>
                    </div>

                    <div className="flex gap-4 mb-4 text-sm">
                        {listing.plots_count > 1 && listing.area_min && listing.area_max ? (
                            <div className="flex items-center gap-1">
                                <Maximize className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {listing.area_min === listing.area_max
                                        ? `${formatArea(listing.area_min)} сот.`
                                        : `от ${formatArea(listing.area_min)} сот.`}
                                </span>
                            </div>
                        ) : listing.total_area && (
                            <div className="flex items-center gap-1">
                                <Maximize className="h-4 w-4 text-muted-foreground" />
                                <span>{formatArea(listing.total_area)} сот.</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-end justify-between mt-auto">
                        <div>
                            <p className="text-2xl font-bold text-primary">
                                {formatPriceRange(listing.price_min, listing.price_max)}
                            </p>
                        </div>
                        <Button asChild size="sm">
                            <Link href={`/listing/${listing.slug}`}>Подробнее</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Default variant
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-shadow pt-0 gap-3">
            {/* Изображение */}
            <div className="relative h-48 overflow-hidden bg-muted">
                <Image
                    src={getImageUrl(imageUrl, placeholderImage)}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                />
                {listing.is_featured && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        Спецпредложение
                    </div>
                )}
                {listing.plots_count > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
                        {listing.plots_count} уч.
                    </div>
                )}
            </div>

            <CardContent className="p-3 flex-1 flex flex-col">
                <h3 className="font-semibold text-base mb-1 line-clamp-2">{listing.title}</h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{locationText}</span>
                </div>

                <div className="flex gap-4 mb-4 text-sm">
                    {listing.plots_count > 1 && listing.area_min && listing.area_max ? (
                        <div className="flex items-center gap-1">
                            <Maximize className="h-4 w-4 text-muted-foreground" />
                            <span>
                                {listing.area_min === listing.area_max
                                    ? `${formatArea(listing.area_min)} сот.`
                                    : `${formatArea(listing.area_min)}–${formatArea(listing.area_max)} сот.`}
                            </span>
                        </div>
                    ) : listing.total_area && (
                        <div className="flex items-center gap-1">
                            <Maximize className="h-4 w-4 text-muted-foreground" />
                            <span>{formatArea(listing.total_area)} сот.</span>
                        </div>
                    )}
                </div>

                <div className="flex items-end justify-between mt-auto">
                    <div>
                        <p className="text-lg font-bold text-primary">
                            {formatPriceRange(listing.price_min, listing.price_max)}
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href={`/listing/${listing.slug}`}>Подробнее</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Реэкспорт типа для обратной совместимости
export type { ListingData };
