import { Metadata } from "next";
import { SSR_API_URL, SITE_URL } from "@/lib/config";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Новости — КалининградЗем",
    description: "Новости рынка загородной недвижимости Калининградской области.",
    alternates: {
        canonical: `${SITE_URL}/news`,
    }
};

async function getNews() {
    try {
        const res = await fetch(`${SSR_API_URL}/api/news/?size=50`, { next: { revalidate: 60 } });
        if (!res.ok) return { items: [] };
        return res.json();
    } catch { return { items: [] }; }
}

export default async function NewsListPage() {
    const data = await getNews();
    const news = data.items || [];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-3xl font-bold mb-8">Новости</h1>
            {news.length === 0 ? (
                <p className="text-muted-foreground">Новостей пока нет.</p>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {news.map((item: any) => (
                        <div key={item.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card flex flex-col">
                            <div className="text-sm text-muted-foreground mb-2">
                                {new Date(item.published_at).toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <h2 className="text-xl font-semibold mb-3">
                                <Link href={`/news/${item.slug}`} className="hover:text-primary transition-colors">
                                    {item.title}
                                </Link>
                            </h2>
                            {item.excerpt && <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">{item.excerpt}</p>}
                            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                                <Link href={`/news/${item.slug}`} className="text-primary font-medium hover:underline">
                                    Читать далее
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
