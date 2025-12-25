"use client";

import Image from "next/image";
import { useState } from "react";

interface ListingGalleryProps {
    images: string[];
    title: string;
}

export function ListingGallery({ images, title }: ListingGalleryProps) {
    // Если нет изображений, используем заглушку
    const allImages = images.length > 0 ? images : ["/hero-bg.jpg"];
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <div className="space-y-4">
            {/* Основное изображение */}
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted">
                <Image
                    src={allImages[activeIndex]}
                    alt={`${title} - фото ${activeIndex + 1}`}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Миниатюры */}
            {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((src, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${index === activeIndex
                                    ? "border-primary"
                                    : "border-transparent hover:border-muted-foreground/50"
                                }`}
                        >
                            <Image
                                src={src}
                                alt={`Миниатюра ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
