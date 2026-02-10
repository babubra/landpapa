import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/config";
import { getSiteSettings } from "@/lib/server-config";

export async function HeroSection() {
  const settings = await getSiteSettings();

  const heroTitle = settings.hero_title || "Земельные участки в Калининградской области";
  const heroSubtitle = settings.hero_subtitle || "Найдите идеальный участок для строительства дома, ведения хозяйства или инвестиций";
  const heroImage = getImageUrl(settings.hero_image, "/hero-bg.jpg");

  return (
    <div className="relative h-full min-h-[350px] w-full overflow-hidden rounded-xl">
      {/* Фоновое изображение */}
      <Image
        src={heroImage}
        alt={heroTitle}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 66vw"
        quality={50}
        priority
        fetchPriority="high"
      />

      {/* Градиентный оверлей */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Контент */}
      <div className="relative z-20 flex h-full flex-col justify-center px-6 md:px-10 lg:px-12">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-xl leading-tight">
          {heroTitle}
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-lg">
          {heroSubtitle}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" className="text-base" asChild>
            <Link href="/catalog">Смотреть каталог</Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base bg-white/10 border-white/30 text-white hover:bg-white/20" asChild>
            <Link href="/map">Показать на карте</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
