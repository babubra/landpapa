"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface MapBannerProps {
    /** ID локации для формирования ссылки на карту */
    locationId?: number;
}

/**
 * Баннер-ссылка на карту. Отображается в каталоге над карточками объявлений.
 */
export function MapBanner({ locationId }: MapBannerProps) {
    // Формируем ссылку на карту с фильтром по локации
    const mapUrl = locationId ? `/map?location_id=${locationId}` : "/map";

    return (
        <Link href={mapUrl} className="block group mb-6">
            <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden">
                {/* Фоновое изображение карты */}
                <Image
                    src="/images/map-banner.png"
                    alt="Посмотреть участки на карте"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    priority={false}
                />

                {/* Затемнение для лучшей читаемости кнопки */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

                {/* Центрированная кнопка */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="shadow-lg bg-white/95 hover:bg-white text-gray-900 gap-2"
                    >
                        <MapPin className="h-5 w-5" />
                        Показать на карте
                    </Button>
                </div>
            </div>
        </Link>
    );
}
