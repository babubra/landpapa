"use client";

import Image from "next/image";
import { CheckCircle } from "lucide-react";

export function AboutCarousel() {
    const slide = {
        image: "/about_us_section_image.jpg",
        title: "Бесплатные геодезические услуги",
        description: "При покупке участка наши профессиональные геодезисты бесплатно выполнят все необходимые работы.",
        benefits: [
            "Бесплатный вынос границ на местности",
            "Топографическая съёмка участка",
            "Информация о высотной ситуации",
            "Определение расположения коммуникаций",
        ],
    };

    return (
        <section className="pt-6">
            <div className="relative rounded-2xl overflow-hidden h-[450px] md:h-[380px]">
                {/* Фоновое изображение */}
                <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    priority
                />

                {/* Градиент справа для читабельности */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/60 to-transparent" />

                {/* Контент */}
                <div className="relative z-10 h-full flex items-center justify-end">
                    <div className="w-full md:w-1/2 lg:w-2/5 p-6 md:p-10 lg:p-12 text-white">
                        <h2 className="mb-4 text-2xl md:text-3xl text-white font-bold">
                            {slide.title}
                        </h2>
                        <p className="text-white/80 mb-6">
                            {slide.description}
                        </p>

                        <ul className="space-y-3">
                            {slide.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-white/90">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
