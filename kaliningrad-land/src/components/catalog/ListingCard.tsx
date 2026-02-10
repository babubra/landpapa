"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ListingData } from "@/types/listing";
import { getImageUrl } from "@/lib/config";
import { buildListingUrl } from "@/lib/geoUrl";
import { getListingDisplayTitle } from "@/lib/listingTitle";

// Статический placeholder для избежания мигания при гидратации
const DEFAULT_PLACEHOLDER = "/hero-bg.jpg";

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

export interface ListingCardProps {
    listing: ListingData;
    variant?: "default" | "compact";
    h1Template?: string | null;  // Шаблон для генерации названия по настройкам сайта
    placeholderImage?: string;   // URL placeholder-изображения из настроек
}

export function ListingCard({ listing, variant = "default", h1Template, placeholderImage }: ListingCardProps) {
    // Получаем URL изображения (поддержка обоих полей)
    const imgData = listing.image || listing.main_image;
    const imageUrl = imgData ? (imgData.thumbnail_url || imgData.url) : null;

    // Используем placeholder из настроек или статический fallback
    const placeholder = placeholderImage || DEFAULT_PLACEHOLDER;
    const resolvedImageUrl = getImageUrl(imageUrl, placeholder);

    const locationText = (() => {
        if (listing.location) {
            const locName = listing.location.settlement_type
                ? `${listing.location.settlement_type} ${listing.location.name}`
                : listing.location.name;

            if (listing.location.type === 'settlement' && listing.location.parent) {
                return `${locName}, ${listing.location.parent.name}`;
            }
            return locName;
        }

        return listing.settlement
            ? listing.settlement.district
                ? `${listing.settlement.name}, ${listing.settlement.district.name}`
                : listing.settlement.name
            : "Калининградская область";
    })();

    // Строим гео-URL для листинга
    const listingUrl = buildListingUrl({
        slug: listing.slug,
        location: listing.location,
    });

    if (variant === "compact") {
        return (
            <Card className="overflow-hidden group hover:shadow-lg transition-shadow pt-0 gap-3">
                {/* Изображение */}
                <div className="relative h-48 overflow-hidden bg-muted">
                    <Image
                        src={resolvedImageUrl}
                        alt={getListingDisplayTitle(listing, h1Template)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={50}
                    />
                    {listing.plots_count > 1 && (
                        <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                            {listing.plots_count} уч.
                        </div>
                    )}
                </div>

                <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{getListingDisplayTitle(listing, h1Template)}</h3>

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
                            <p className="text-xl font-bold text-primary">
                                {formatPriceRange(listing.price_min, listing.price_max)}
                            </p>
                        </div>
                        <Button asChild size="sm">
                            <Link href={listingUrl}>Подробнее</Link>
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
                    src={resolvedImageUrl}
                    alt={getListingDisplayTitle(listing, h1Template)}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={50}
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
                <h3 className="font-semibold text-base mb-1 line-clamp-2">{getListingDisplayTitle(listing, h1Template)}</h3>

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
                        <Link href={listingUrl}>Подробнее</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Реэкспорт типа для обратной совместимости
export type { ListingData };
