import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Settlement {
    id: number;
    name: string;
    slug: string;
    district?: {
        id: number;
        name: string;
        slug: string;
    };
}

interface Realtor {
    id: number;
    name: string;
    phone: string;
    company: string | null;
}

export interface ListingData {
    id: number;
    slug: string;
    title: string;
    price_min: number | null;
    price_max: number | null;
    total_area: number | null;
    plots_count: number;
    is_featured: boolean;
    realtor: Realtor;
    settlement?: Settlement | null;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ru-RU").format(price);
}

function formatArea(areaM2: number): string {
    // Площадь в м², преобразуем в сотки для отображения
    const sotki = areaM2 / 100;
    return sotki.toFixed(1);
}

function formatPriceRange(min: number | null, max: number | null): string {
    if (!min && !max) return "Цена по запросу";
    if (min === max || !max) return `${formatPrice(min!)} ₽`;
    return `от ${formatPrice(min!)} ₽`;
}

interface ListingCardProps {
    listing: ListingData;
}

export function ListingCard({ listing }: ListingCardProps) {
    const locationText = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : "Калининградская область";

    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
            {/* Изображение */}
            <div className="relative h-48 overflow-hidden bg-muted">
                <Image
                    src="/hero-bg.jpg"
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
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

            <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">{listing.title}</h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{locationText}</span>
                </div>

                <div className="flex gap-4 mb-4 text-sm">
                    {listing.total_area && (
                        <div className="flex items-center gap-1">
                            <Maximize className="h-4 w-4 text-muted-foreground" />
                            <span>{formatArea(listing.total_area)} сот.</span>
                        </div>
                    )}
                </div>

                <div className="flex items-end justify-between">
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
