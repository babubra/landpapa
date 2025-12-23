"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide {
    image: string;
    title: string;
    description: string;
    benefits: string[];
}

const slides: Slide[] = [
    {
        image: "/buy_first_get_more.jpg",
        title: "Покупайте напрямую — получайте больше",
        description: "Мы продаём земельные участки из первых рук, что позволяет предложить вам лучшие условия и полную прозрачность сделки.",
        benefits: [
            "Продажа участков из первых рук — без посредников",
            "Юридическая чистота всех документов",
            "Полное сопровождение сделки",
        ],
    },
    {
        image: "/about_us_section_image.jpg",
        title: "Бесплатные геодезические услуги",
        description: "При покупке участка наши профессиональные геодезисты бесплатно выполнят все необходимые работы.",
        benefits: [
            "Бесплатный вынос границ на местности",
            "Топографическая съёмка участка",
            "Информация о высотной ситуации",
            "Определение расположения коммуникаций",
        ],
    },
    {
        image: "/about_us_section_image.jpg",
        title: "Удобное расположение участков",
        description: "Участки расположены в живописных местах Калининградской области с развитой инфраструктурой.",
        benefits: [
            "Близость к городам и транспортным развязкам",
            "Экологически чистые районы",
            "Возможность подключения коммуникаций",
            "Развивающаяся инфраструктура",
        ],
    },
];

export function AboutCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const slide = slides[currentSlide];

    return (
        <section className="pt-6">
            <div className="relative rounded-2xl overflow-hidden h-[450px] md:h-[380px]">
                {/* Фоновое изображение */}
                <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover transition-opacity duration-500"
                />

                {/* Градиент справа для читабельности */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/60 to-transparent" />

                {/* Контент */}
                <div className="relative z-10 h-full flex items-center justify-end">
                    <div className="w-full md:w-1/2 lg:w-2/5 p-6 md:p-10 lg:p-12 text-white">
                        <h2 className="mb-4 text-2xl md:text-3xl text-white">
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

                {/* Навигация */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={prevSlide}
                        className="h-10 w-10 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={nextSlide}
                        className="h-10 w-10 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>

                    {/* Индикаторы */}
                    <div className="flex gap-2 ml-4">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-2 rounded-full transition-all ${index === currentSlide
                                    ? "w-6 bg-primary"
                                    : "w-2 bg-white/50 hover:bg-white/70"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
