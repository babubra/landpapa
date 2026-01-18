import { SITE_URL } from "@/lib/config";
import { SeoJsonLd } from "./SeoJsonLd";

/**
 * JSON-LD разметка SiteNavigationElement.
 * Помогает Google понять структуру навигации сайта для формирования sitelinks.
 */
export function SiteNavigationSchema() {
    const navigation = [
        { name: "Главная", href: "/" },
        { name: "Каталог", href: "/catalog" },
        { name: "Карта", href: "/map" },
        { name: "Новости", href: "/news" },
        { name: "О нас", href: "/about" },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": navigation.map((item, index) => ({
            "@type": "SiteNavigationElement",
            "position": index + 1,
            "name": item.name,
            "url": `${SITE_URL}${item.href}`,
        })),
    };

    return <SeoJsonLd data={jsonLd} />;
}
