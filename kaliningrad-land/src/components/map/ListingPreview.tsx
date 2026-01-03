"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListingData } from "@/types/listing";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface ListingPreviewProps {
    listing: ListingData;
    onClose: () => void;
}

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

function getImageUrl(url: string | null | undefined): string {
    if (!url) return "/hero-bg.jpg";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
}

export function ListingPreview({ listing, onClose }: ListingPreviewProps) {
    const locationText = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : "Калининградская область";

    // Получаем URL изображения (поддержка обоих полей)
    const imgData = listing.image || listing.main_image;
    const imageUrl = imgData ? (imgData.thumbnail_url || imgData.url) : null;

    return (
        <div className="p-4 flex gap-4 items-start">
            {/* Изображение */}
            <div className="relative w-40 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                <Image
                    src={getImageUrl(imageUrl)}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    unoptimized
                />
                {listing.is_featured && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                        Спец
                    </div>
                )}
            </div>

            {/* Информация */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{locationText}</span>
                </div>

                <div className="flex gap-4 mt-2 text-sm">
                    {listing.plots_count > 1 && listing.area_min && listing.area_max ? (
                        <div className="flex items-center gap-1">
                            <Maximize className="h-3 w-3 text-muted-foreground" />
                            <span>
                                {listing.area_min === listing.area_max
                                    ? `${formatArea(listing.area_min)} сот.`
                                    : `${formatArea(listing.area_min)}–${formatArea(listing.area_max)} сот.`}
                            </span>
                        </div>
                    ) : listing.total_area && (
                        <div className="flex items-center gap-1">
                            <Maximize className="h-3 w-3 text-muted-foreground" />
                            <span>{formatArea(listing.total_area)} сот.</span>
                        </div>
                    )}
                    {listing.plots_count > 1 && (
                        <span className="text-muted-foreground">
                            {listing.plots_count} уч.
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <p className="text-xl font-bold text-primary">
                        {formatPriceRange(listing.price_min, listing.price_max)}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${listing.realtor.phone}`}>
                                <Phone className="h-4 w-4 mr-1" />
                                Позвонить
                            </a>
                        </Button>
                        <Button size="sm" asChild>
                            <Link href={`/listing/${listing.slug}`}>
                                Подробнее
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
