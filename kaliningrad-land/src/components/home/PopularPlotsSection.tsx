import Image from "next/image";
import Link from "next/link";
import { MapPin, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";

interface Realtor {
    id: number;
    name: string;
    phone: string;
    company: string | null;
}

interface Listing {
    id: number;
    slug: string;
    title: string;
    price_min: number | null;
    price_max: number | null;
    total_area: number | null;
    plots_count: number;
    realtor: Realtor;
}

async function getPopularListings(): Promise<Listing[]> {
    try {
        const res = await fetch(`${API_URL}/api/listings/popular?limit=4`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            console.error("Failed to fetch listings:", res.status);
            return [];
        }

        return await res.json();
    } catch (error) {
        console.error("Error fetching listings:", error);
        return [];
    }
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ru-RU").format(price);
}

function formatArea(area: number): string {
    // Площадь в м², преобразуем в сотки для отображения
    const sotki = area / 100;
    return sotki.toFixed(1);
}

function formatPriceRange(min: number | null, max: number | null): string {
    if (!min && !max) return "Цена по запросу";
    if (min === max || !max) return `${formatPrice(min!)} ₽`;
    return `от ${formatPrice(min!)} ₽`;
}

// Fallback данные
const fallbackListings: Listing[] = [
    {
        id: 1,
        slug: "example-1",
        title: "Участок у озера",
        price_min: 1500000,
        price_max: 1500000,
        total_area: 1500,
        plots_count: 1,
        realtor: { id: 1, name: "Иванов И.И.", phone: "+7 (4012) 12-34-56", company: null },
    },
    {
        id: 2,
        slug: "example-2",
        title: "Массив участков",
        price_min: 1800000,
        price_max: 2200000,
        total_area: 3600,
        plots_count: 3,
        realtor: { id: 1, name: "Иванов И.И.", phone: "+7 (4012) 12-34-56", company: null },
    },
];

function ListingCard({ listing }: { listing: Listing }) {
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
            {/* Изображение-заглушка */}
            <div className="relative h-48 overflow-hidden bg-muted">
                <Image
                    src="/hero-bg.jpg"
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {listing.plots_count > 1 && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        {listing.plots_count} участка
                    </div>
                )}
            </div>

            <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title}</h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>Калининградская область</span>
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

export async function PopularPlotsSection() {
    const listings = await getPopularListings();
    const displayListings = listings.length > 0 ? listings : fallbackListings;

    return (
        <section className="pt-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl mb-2">Популярные участки</h2>
                    <p className="text-muted-foreground">Лучшие предложения этой недели</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/catalog">Смотреть все</Link>
                </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {displayListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                ))}
            </div>
        </section>
    );
}
