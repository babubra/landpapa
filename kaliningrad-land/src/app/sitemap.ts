import { MetadataRoute } from 'next'
import { SSR_API_URL, SITE_URL } from '@/lib/config'

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

    try {
        const res = await fetch(`${SSR_API_URL}/api/listings/slugs/all`, {
            next: { revalidate: 3600 }
        });

        if (res.ok) {
            const slugs: string[] = await res.json();
            slugs.forEach((slug) => {
                if (slug) {
                    routes.push({
                        url: `${SITE_URL}/catalog/${slug}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.6,
                    })
                }
            })
        }
    } catch (error) {
        console.error('Error generating listing sitemap:', error)
    }

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
