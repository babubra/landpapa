import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/_next/static/'],
            disallow: [
                // API и системные
                '/api/',
                '/_next/',

                // Карта с координатами и фильтрами
                '/map?*',

                // Каталог: пагинация и фильтры
                '/catalog?*page*',
                '/catalog?*price*',
                '/catalog?*area*',
                '/catalog?*sort*',
                '/catalog?*purpose*',
                '/catalog?*land_use*',

                // Административные
                '/admin/',
                '/login/',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
