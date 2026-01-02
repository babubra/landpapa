import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingSidebar } from "@/components/listing/ListingSidebar";
import { BackButton } from "@/components/ui/back-button";
import { API_URL } from "@/lib/config";

interface ListingPageProps {
    params: Promise<{ slug: string }>;
}

interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    address: string | null;
    price_public: number | null;
    status: string;
    land_use: { name: string } | null;
    land_category: { name: string } | null;
}

interface Realtor {
    phone: string;
}

interface Settlement {
    name: string;
    district?: { name: string };
}

interface ListingDetail {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    price_min: number | null;
    price_max: number | null;
    total_area: number | null;
    plots_count: number;
    realtor: Realtor;
    settlement?: Settlement | null;
    plots: Plot[];
    meta_title: string | null;
    meta_description: string | null;
}

async function getListing(slug: string): Promise<ListingDetail | null> {
    try {
        const res = await fetch(`${API_URL}/api/listings/${slug}`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: ListingPageProps): Promise<Metadata> {
    const { slug } = await params;
    const listing = await getListing(slug);

    if (!listing) {
        return { title: "Объявление не найдено" };
    }

    return {
        title: listing.meta_title || listing.title,
        description: listing.meta_description || `Земельный участок: ${listing.title}`,
    };
}

export default async function ListingPage({ params }: ListingPageProps) {
    const { slug } = await params;
    const listing = await getListing(slug);

    if (!listing) {
        notFound();
    }

    // Формируем локацию
    const location = listing.settlement
        ? listing.settlement.district
            ? `${listing.settlement.name}, ${listing.settlement.district.name}`
            : listing.settlement.name
        : undefined;

    // Определяем основное назначение земли
    const landUse = listing.plots[0]?.land_use?.name;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Назад */}
                <div className="mb-6">
                    <BackButton />
                </div>

                {/* Заголовок */}
                <h1 className="text-3xl font-bold mb-8">{listing.title}</h1>

                {/* Основной контент */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Левая колонка: галерея + описание */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Галерея */}
                        <ListingGallery images={[]} title={listing.title} />

                        {/* Описание */}
                        {listing.description && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Описание</h2>
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: listing.description }}
                                />
                            </div>
                        )}

                        {/* Карта (заглушка) */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Расположение на карте</h2>
                            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                                <p className="text-muted-foreground">
                                    Карта будет здесь (React Leaflet)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Правая колонка: боковая панель */}
                    <div>
                        <div className="sticky top-24">
                            <ListingSidebar
                                phone={listing.realtor.phone}
                                priceMin={listing.price_min}
                                priceMax={listing.price_max}
                                totalArea={listing.total_area}
                                plotsCount={listing.plots_count}
                                landUse={landUse}
                                location={location}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
