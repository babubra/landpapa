import { HeroSection } from "@/components/home/HeroSection";
import { SearchFilter } from "@/components/home/SearchFilter";
import { AboutCarousel } from "@/components/home/AboutCarousel";
import { MaternityCapitalSection } from "@/components/home/MaternityCapitalSection";
import { PopularPlotsSection } from "@/components/home/PopularPlotsSection";
import { NewsSection } from "@/components/home/NewsSection";
import { AboutTextSection } from "@/components/home/AboutTextSection";

import { SITE_URL } from "@/lib/config";
import { getSiteSettings } from "@/lib/server-config";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";

export default async function Home() {
  const settings = await getSiteSettings();

  // Собираем ссылки на соцсети
  const sameAs = [
    settings.org_vk_url,
    settings.org_telegram_url,
    settings.org_max_url,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": settings.site_name || "РКК земля",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "description": settings.site_description || settings.site_subtitle,
    "telephone": settings.site_phone,
    "email": settings.site_email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings.site_address || "ул. Брамса, 40",
      "addressLocality": "Калининград",
      "addressRegion": "Калининградская область",
      "postalCode": "236000",
      "addressCountry": "RU"
    },
    "areaServed": {
      "@type": "State",
      "name": "Калининградская область"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": settings.site_phone,
      "contactType": "sales",
      "availableLanguage": "Russian"
    },
    ...(sameAs.length > 0 && { sameAs })
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

      {/* Карусель услуг */}
      <section className="pt-6">
        <AboutCarousel />
      </section>

      {/* Популярные участки */}
      <PopularPlotsSection />

      {/* SEO-текст о компании */}
      <section className="py-6">
        <AboutTextSection />
      </section>

      {/* Секция материнский капитал */}
      <MaternityCapitalSection />

      {/* Новости */}
      <NewsSection />
    </div>
  );
}
