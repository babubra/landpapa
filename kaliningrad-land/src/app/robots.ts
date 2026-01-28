import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/_next/static/'],
            disallow: [
                '/api/',
                '/_next/',
                '/map?lat=*',  // Мусорные URL карты с координатами
                '/map?*lat=*', // Вариант с другими параметрами перед lat
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
