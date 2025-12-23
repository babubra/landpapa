import { HeroSection } from "@/components/home/HeroSection";
import { SearchFilter } from "@/components/home/SearchFilter";
import { AboutCarousel } from "@/components/home/AboutCarousel";
import { MaternityCapitalSection } from "@/components/home/MaternityCapitalSection";
import { PopularPlotsSection } from "@/components/home/PopularPlotsSection";
import { NewsSection } from "@/components/home/NewsSection";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
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
