"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/config";

interface ImageType {
    url: string;
    thumbnail_url: string | null;
}

interface ListingGalleryProps {
    images: ImageType[];
    title: string;
    placeholderImage?: string;
}

// Статический placeholder для избежания мигания при гидратации
const DEFAULT_PLACEHOLDER = "/hero-bg.jpg";

export function ListingGallery({ images, title, placeholderImage = DEFAULT_PLACEHOLDER }: ListingGalleryProps) {
    // Если нет изображений, используем заглушку
    const hasImages = images.length > 0;
    const [activeIndex, setActiveIndex] = useState(0);

    // Навигация: предыдущее изображение
    const goToPrev = useCallback(() => {
        if (!hasImages) return;
        setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }, [hasImages, images.length]);

    // Навигация: следующее изображение
    const goToNext = useCallback(() => {
        if (!hasImages) return;
        setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, [hasImages, images.length]);

    // Поддержка клавиатуры
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "ArrowRight") goToNext();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToPrev, goToNext]);

    // Получаем URL текущего изображения
    const currentImageUrl = hasImages
        ? getImageUrl(images[activeIndex].url)
        : getImageUrl(null, placeholderImage);

    return (
        <div className="space-y-4">
            {/* Основное изображение с навигацией */}
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted group">
                <Image
                    src={currentImageUrl}
                    alt={`${title} - фото ${activeIndex + 1}`}
                    fill
                    className="object-cover transition-opacity duration-300"
                    priority
                    unoptimized
                />

                {/* Стрелки навигации */}
                {hasImages && images.length > 1 && (
                    <>
                        {/* Левая стрелка */}
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-black/70 hover:bg-black/90 text-white"
                            onClick={goToPrev}
                            aria-label="Предыдущее фото"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        {/* Правая стрелка */}
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-black/70 hover:bg-black/90 text-white"
                            onClick={goToNext}
                            aria-label="Следующее фото"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>

                        {/* Счётчик фото */}
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                            {activeIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>

            {/* Миниатюры */}
            {hasImages && images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {images.map((img, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${index === activeIndex
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-transparent hover:border-muted-foreground/50"
                                }`}
                        >
                            <Image
                                src={getImageUrl(img.thumbnail_url || img.url)}
                                alt={`Миниатюра ${index + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
