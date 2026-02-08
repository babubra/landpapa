"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/catalog/ListingCard";
import { usePlaceholderImage, useSiteSettings } from "@/contexts/SiteSettingsContext";
import type { ListingData } from "@/types/listing";

async function getPopularListings(): Promise<ListingData[]> {
    try {
        const res = await fetch("/api/listings/popular/?limit=4", {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            console.error("Failed to fetch popular listings");
            return [];
        }

        return await res.json();
    } catch (error) {
        console.error("Error fetching listings:", error);
        return [];
    }
}

export function PopularPlotsSection() {
    const [listings, setListings] = useState<ListingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const placeholderImage = usePlaceholderImage();
    const { settings } = useSiteSettings();
    const h1Template = settings?.seo_listing_h1_template || null;

    useEffect(() => {
        getPopularListings().then((data) => {
            setListings(data);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return (
            <section className="pt-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Популярные участки</h2>
                        <p className="text-muted-foreground text-sm">
                            Лучшие предложения этой недели
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-80 animate-pulse bg-muted rounded-lg"
                        />
                    ))}
                </div>
            </section>
        );
    }

    if (listings.length === 0) {
        return null;
    }

    return (
        <section className="pt-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Популярные участки</h2>
                    <p className="text-muted-foreground text-sm">
                        Лучшие предложения этой недели
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/catalog">Смотреть все</Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((listing) => (
                    <ListingCard
                        key={listing.id}
                        listing={listing}
                        variant="compact"
                        h1Template={h1Template}
                        placeholderImage={placeholderImage}
                    />
                ))}
            </div>
        </section>
    );
}
