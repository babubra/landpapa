import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SSR_API_URL, SITE_URL } from "@/lib/config";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface NewsPageProps {
    params: Promise<{ slug: string }>;
}

async function getNewsBySlug(slug: string) {
    try {
        const res = await fetch(`${SSR_API_URL}/api/news/${slug}`, { cache: "no-store" });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
    const { slug } = await params;
    const news = await getNewsBySlug(slug);
    if (!news) return { title: "Новость не найдена" };

    return {
        title: news.title,
        description: news.excerpt || news.title,
        openGraph: {
            title: news.title,
            description: news.excerpt || news.title,
            type: "article",
            url: `${SITE_URL}/news/${slug}`,
            publishedTime: news.published_at,
        },
        alternates: {
            canonical: `${SITE_URL}/news/${slug}`,
        }
    }
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
    const { slug } = await params;
    const news = await getNewsBySlug(slug);

    if (!news) notFound();

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": news.title,
        "datePublished": news.published_at,
        "description": news.excerpt,
        "url": `${SITE_URL}/news/${slug}`,
        "author": {
            "@type": "Organization",
            "name": "РКК земля"
        },
        "publisher": {
            "@type": "Organization",
            "name": "РКК земля",
            "url": SITE_URL
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
            <SeoJsonLd data={jsonLd} />

            <Breadcrumbs items={[
                { name: "Новости", href: "/news" },
                { name: news.title, href: `/news/${slug}` }
            ]} />

            <article className="prose prose-lg max-w-none dark:prose-invert">
                <h1 className="mb-4">{news.title}</h1>
                <div className="text-muted-foreground mb-8 not-prose flex items-center gap-4 text-sm">
                    {new Date(news.published_at).toLocaleDateString('ru-RU', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    })}
                </div>

                {news.content ? (
                    <div dangerouslySetInnerHTML={{ __html: news.content }} />
                ) : (
                    <p className="text-lg leading-relaxed">{news.excerpt}</p>
                )}
            </article>
        </div>
    )
}
