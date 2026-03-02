/**
 * SeoBlocksSection — серверный компонент для отображения SEO-блоков на главной.
 * 
 * Заменяет клиентский PopularPlotsSection.
 * Данные загружаются на сервере (SSR) — содержимое видно поисковикам.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/catalog/ListingCard";
import { SSR_API_URL } from "@/lib/config";
import type { ListingData } from "@/types/listing";

// Типы для ответа API
interface SeoBlockData {
    id: number;
    title: string;
    subtitle: string | null;
    description: string | null;
    link_url: string;
    listings: ListingData[];
}

// Получение SEO-блоков (серверный fetch)
async function getSeoBlocks(): Promise<SeoBlockData[]> {
    try {
        const res = await fetch(`${SSR_API_URL}/api/public/seo-blocks`, {
            cache: "no-store",
        });
        if (!res.ok) {
            console.error("Failed to fetch SEO blocks:", res.status);
            return [];
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching SEO blocks:", error);
        return [];
    }
}

interface SeoBlocksSectionProps {
    placeholderImage?: string | null;
    h1Template?: string | null;
}

export async function SeoBlocksSection({ placeholderImage, h1Template }: SeoBlocksSectionProps) {
    const blocks = await getSeoBlocks();

    if (blocks.length === 0) {
        return null;
    }

    return (
        <>
            {blocks.map((block) => (
                <section key={block.id} className="py-6">
                    {/* Заголовок блока */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold">{block.title}</h2>
                            {block.subtitle && (
                                <p className="text-muted-foreground mt-1">{block.subtitle}</p>
                            )}
                        </div>
                        <Button variant="ghost" asChild>
                            <Link href={block.link_url} className="gap-1">
                                Смотреть все
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    {/* Карточки листингов */}
                    {block.listings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {block.listings.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    placeholderImage={placeholderImage || undefined}
                                    h1Template={h1Template}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            Объявления в этой категории пока не добавлены
                        </p>
                    )}

                    {/* SEO-описание */}
                    {block.description && (
                        <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
                            <p>{block.description}</p>
                        </div>
                    )}
                </section>
            ))}
        </>
    );
}
