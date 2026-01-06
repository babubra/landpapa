import { HeroSection } from "@/components/home/HeroSection";
import { SearchFilter } from "@/components/home/SearchFilter";
import { AboutCarousel } from "@/components/home/AboutCarousel";
import { MaternityCapitalSection } from "@/components/home/MaternityCapitalSection";
import { PopularPlotsSection } from "@/components/home/PopularPlotsSection";
import { NewsSection } from "@/components/home/NewsSection";

import { getSiteSettings, SITE_URL } from "@/lib/config";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";

export default async function Home() {
  const settings = await getSiteSettings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings.site_title || "КалининградЗем",
    "url": SITE_URL,
    "description": settings.site_subtitle,
    "telephone": settings.site_phone,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SeoJsonLd data={jsonLd} />
      {/* Hero (2/3) + Filter (1/3) layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hero - занимает 2/3 на десктопе */}
        <div className="lg:col-span-2">
          <HeroSection />
        </div>

        {/* Filter - занимает 1/3 на десктопе */}
        <div className="lg:col-span-1">
          <SearchFilter />
        </div>
      </div>

      {/* Карусель "О нас" */}
      <AboutCarousel />

      {/* Популярные участки */}
      <PopularPlotsSection />

      {/* Секция материнский капитал */}
      <MaternityCapitalSection />

      {/* Новости */}
      <NewsSection />
    </div>
  );
}
