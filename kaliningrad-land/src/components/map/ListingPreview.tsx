"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListingData } from "@/types/listing";

import { getImageUrl } from "@/lib/config";
import { buildListingUrl } from "@/lib/geoUrl";
import { getListingDisplayTitle } from "@/lib/listingTitle";

// Статический placeholder для избежания мигания при гидратации
const DEFAULT_PLACEHOLDER = "/hero-bg.jpg";

interface ListingPreviewProps {
    listing: ListingData;
    onClose: () => void;
    h1Template?: string | null;
    placeholderImage?: string;
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

/**
 * Вертикальная карточка превью объявления для боковой панели карты.
 * Фиксированная ширина 350px, вертикальный layout.
 */
export function ListingPreview({ listing, onClose, h1Template, placeholderImage }: ListingPreviewProps) {
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

    // Получаем URL изображения (поддержка обоих полей)
    const imgData = listing.image || listing.main_image;
    const imageUrl = imgData ? (imgData.thumbnail_url || imgData.url) : null;
    const placeholder = placeholderImage || DEFAULT_PLACEHOLDER;
    const resolvedImageUrl = getImageUrl(imageUrl, placeholder);

    // Строим гео-URL для листинга
    const listingUrl = buildListingUrl({
        slug: listing.slug,
        location: listing.location,
    });

    return (
        <div className="w-[350px] h-full flex flex-col bg-card border-r overflow-hidden">
            {/* Кнопка закрытия */}
            <div className="absolute top-2 right-2 z-10">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Изображение сверху с паддингом */}
            <div className="p-4 pb-0">
                <div className="relative w-full h-44 rounded-lg overflow-hidden">
                    <Image
                        src={resolvedImageUrl}
                        alt={getListingDisplayTitle(listing, h1Template)}
                        fill
                        className="object-cover"
                        sizes="350px"
                    />
                    {listing.is_featured && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                            Спецпредложение
                        </div>
                    )}
                </div>
            </div>

            {/* Информация */}
            <div className="flex-1 p-4 flex flex-col overflow-y-auto">
                <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                    {getListingDisplayTitle(listing, h1Template)}
                </h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{locationText}</span>
                </div>

                {/* Характеристики */}
                <div className="flex flex-wrap gap-3 text-sm mb-4">
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
                    {listing.plots_count > 1 && (
                        <span className="text-muted-foreground">
                            {listing.plots_count} участков
                        </span>
                    )}
                </div>

                {/* Цена и кнопка подробнее */}
                <p className="text-2xl font-bold text-primary mb-3">
                    {formatPriceRange(listing.price_min, listing.price_max)}
                </p>

                {/* Кнопки */}
                <div className="space-y-2">
                    <Button className="w-full" asChild>
                        <Link href={listingUrl}>
                            Подробнее
                        </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <a href={`tel:${listing.realtor.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Позвонить
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
