import Image from "next/image";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="relative h-full min-h-[350px] w-full overflow-hidden rounded-xl">
      {/* Фоновое изображение */}
      <Image
        src="/hero-bg.jpg"
        alt="Земельные участки в Калининградской области"
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />

      {/* Градиентный оверлей */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Контент */}
      <div className="relative z-10 flex h-full flex-col justify-center px-6 md:px-10 lg:px-12">
        <h1 className="text-white mb-4 max-w-xl">
          Земельные участки в Калининградской области
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-lg">
          Найдите идеальный участок для строительства дома,
          ведения хозяйства или инвестиций
        </p>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" className="text-base">
            Смотреть каталог
          </Button>
          <Button size="lg" variant="outline" className="text-base bg-white/10 border-white/30 text-white hover:bg-white/20">
            Показать на карте
          </Button>
        </div>
      </div>
    </div>
  );
}
