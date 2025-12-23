import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface NewsItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  published_at: string;
  views_count: number;
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("http://localhost:8000/api/news/latest?limit=6", {
      next: { revalidate: 60 }, // Кэш на 60 секунд
    });

    if (!res.ok) {
      console.error("Failed to fetch news:", res.status);
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NewsItem({ news }: { news: NewsItem }) {
  return (
    <Link
      href={`/news/${news.slug}`}
      className="flex gap-4 py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors group"
    >
      <span className="text-primary font-medium text-sm whitespace-nowrap">
        {formatTime(news.published_at)}
      </span>
      <span className="text-foreground text-sm group-hover:text-primary transition-colors">
        {news.title}
      </span>
    </Link>
  );
}

// Fallback данные если API недоступен
const fallbackNews: NewsItem[] = [
  {
    id: 1,
    slug: "example-1",
    title: "Открыт новый коттеджный посёлок в Зеленоградском районе",
    excerpt: "",
    published_at: new Date().toISOString(),
    views_count: 0,
  },
  {
    id: 2,
    slug: "example-2",
    title: "Изменения в программе материнского капитала в 2025 году",
    excerpt: "",
    published_at: new Date().toISOString(),
    views_count: 0,
  },
  {
    id: 3,
    slug: "example-3",
    title: "Как выбрать участок для строительства дома: советы экспертов",
    excerpt: "",
    published_at: new Date().toISOString(),
    views_count: 0,
  },
];

export async function NewsSection() {
  const newsItems = await getLatestNews();
  const displayNews = newsItems.length > 0 ? newsItems : fallbackNews;

  const leftColumn = displayNews.slice(0, 3);
  const rightColumn = displayNews.slice(3, 6);

  return (
    <section className="pt-6 pb-8">
      <div className="rounded-2xl border bg-card p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <h2 className="text-xl font-semibold">Новости</h2>
          <Link
            href="/news"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Две колонки на десктопе, одна на мобильных */}
        <div className="grid md:grid-cols-2 md:gap-8">
          <div>
            {leftColumn.map((news) => (
              <NewsItem key={news.id} news={news} />
            ))}
          </div>
          <div className="hidden md:block">
            {rightColumn.map((news) => (
              <NewsItem key={news.id} news={news} />
            ))}
          </div>
        </div>

        {/* Ссылка на все новости */}
        <div className="mt-4 pt-4 border-t">
          <Link
            href="/news"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Все новости
          </Link>
        </div>
      </div>
    </section>
  );
}
