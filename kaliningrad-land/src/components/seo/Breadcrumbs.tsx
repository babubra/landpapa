import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { SeoJsonLd } from "./SeoJsonLd";
import { SITE_URL } from "@/lib/config";

export interface BreadcrumbItem {
    name: string;
    href: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    /** Скрыть визуальную навигацию, оставив только JSON-LD разметку */
    visuallyHidden?: boolean;
}

/**
 * Компонент хлебных крошек с JSON-LD разметкой BreadcrumbList.
 * 
 * Использование:
 * ```tsx
 * <Breadcrumbs items={[
 *   { name: "Каталог", href: "/catalog" },
 *   { name: "Название участка", href: "/listing/slug" }
 * ]} />
 * 
 * // Только JSON-LD разметка без визуальной навигации
 * <Breadcrumbs items={[...]} visuallyHidden />
 * ```
 */
export function Breadcrumbs({ items, visuallyHidden = false }: BreadcrumbsProps) {
    // Добавляем главную страницу в начало
    const allItems: BreadcrumbItem[] = [
        { name: "Главная", href: "/" },
        ...items,
    ];

    // JSON-LD разметка BreadcrumbList
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": allItems.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${SITE_URL}${item.href}`,
        })),
    };

    // Если visuallyHidden — возвращаем только JSON-LD разметку
    if (visuallyHidden) {
        return <SeoJsonLd data={jsonLd} />;
    }

    return (
        <>
            <SeoJsonLd data={jsonLd} />
            <nav aria-label="Хлебные крошки" className="mb-6">
                <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                    {allItems.map((item, index) => {
                        const isLast = index === allItems.length - 1;
                        const isFirst = index === 0;

                        return (
                            <li key={item.href} className="flex items-center gap-1">
                                {!isFirst && (
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                                {isLast ? (
                                    <span className="text-foreground font-medium truncate max-w-[250px]">
                                        {item.name}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className="hover:text-primary transition-colors flex items-center gap-1"
                                    >
                                        {isFirst && <Home className="h-4 w-4" />}
                                        <span className="hidden sm:inline">{item.name}</span>
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </>
    );
}
