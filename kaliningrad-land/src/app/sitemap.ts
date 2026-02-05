import { MetadataRoute } from 'next'
import { SSR_API_URL, SITE_URL } from '@/lib/config'

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const routes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${SITE_URL}/catalog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/news`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/map`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/contacts`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        }
    ]

    // === Geo-страницы (районы, города, посёлки) ===
    interface LocationSitemapItem {
        path: string[];
        listings_count: number;
    }

    try {
        const res = await fetch(`${SSR_API_URL}/api/locations/slugs/all`, {
            next: { revalidate: 3600 }
        });

        if (res.ok) {
            const items: LocationSitemapItem[] = await res.json();
            items.forEach((item) => {
                if (item.path && item.path.length > 0) {
                    routes.push({
                        url: `${SITE_URL}/${item.path.join('/')}`,
                        lastModified: new Date(),
                        changeFrequency: 'daily',
                        priority: 0.8,
                    })
                }
            })
        } else {
            console.error(`Sitemap fetch failed: ${res.status} from /api/locations/slugs/all`);
        }
    } catch (error) {
        console.error('Error generating geo-pages sitemap:', error)
    }

    // === Листинги ===
    interface ListingSitemapItem {
        slug: string;
        updated_at: string;
        location_path: string[] | null;  // Новая иерархия
        settlement_slug: string | null;  // Fallback
        district_slug: string | null;    // Fallback
    }

    try {
        const res = await fetch(`${SSR_API_URL}/api/listings/slugs/all`, {
            next: { revalidate: 3600 }
        });

        if (res.ok) {
            const items: ListingSitemapItem[] = await res.json();
            items.forEach((item) => {
                let geoPath: string | null = null;

                // Приоритет: location_path (новая иерархия)
                if (item.location_path && item.location_path.length > 0) {
                    geoPath = item.location_path.join('/');
                }
                // Fallback: старые поля
                else if (item.district_slug && item.settlement_slug) {
                    geoPath = `${item.district_slug}/${item.settlement_slug}`;
                }

                if (geoPath && item.slug) {
                    routes.push({
                        url: `${SITE_URL}/${geoPath}/${item.slug}`,
                        lastModified: new Date(item.updated_at),
                        changeFrequency: 'weekly',
                        priority: 0.6,
                    })
                }
            })
        } else {
            console.error(`Sitemap fetch failed: ${res.status} from /api/listings/slugs/all`);
        }
    } catch (error) {
        console.error('Error generating listing sitemap:', error)
    }

    // === Новости ===
    try {
        const res = await fetch(`${SSR_API_URL}/api/news/slugs/all`, {
            next: { revalidate: 3600 }
        });

        if (res.ok) {
            const slugs: string[] = await res.json();
            slugs.forEach((slug) => {
                if (slug) {
                    routes.push({
                        url: `${SITE_URL}/news/${slug}`,
                        lastModified: new Date(),
                        changeFrequency: 'daily',
                        priority: 0.6,
                    })
                }
            })
        }
    } catch (error) {
        console.error('Error generating news sitemap:', error)
    }

    return routes
}
