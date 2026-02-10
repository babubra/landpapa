"use client";

import Image from "next/image";
import { CheckCircle } from "lucide-react";

interface FeatureCardProps {
    image: string;
    title: string;
    description: string;
    benefits: string[];
}

function FeatureCard({ image, title, description, benefits }: FeatureCardProps) {
    return (
        <div className="relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-[220px] flex-1">
            {/* Фоновое изображение */}
            <Image
                src={image}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={50}
                loading="lazy"
            />

            {/* Затемнение для читабельности */}
            <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/60 to-black/40" />

            {/* Контент */}
            <div className="relative z-10 h-full flex items-center justify-end">
                <div className="w-full md:w-3/4 lg:w-3/5 p-6 md:p-8 text-white">
                    <h3 className="mb-3 text-lg md:text-xl font-bold text-white text-right">
                        {title}
                    </h3>
                    <p className="text-white/80 mb-4 text-sm md:text-base text-right">
                        {description}
                    </p>

                    <ul className="space-y-2">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start justify-end gap-3 text-right">
                                <span className="text-white/90 text-sm">{benefit}</span>
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export function AboutCarousel() {
    const features: FeatureCardProps[] = [
        {
            image: "/about_us_section_image2.jpg",
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
            image: "/about-carousel-house.webp",
            title: "Скидка 50% на кадастровые работы",
            description: "При покупке участка у нас вы получаете скидку 50% на все кадастровые работы на купленном участке.",
            benefits: [
                "Подготовка увеомлений о планируемом строительстве",
                "Постановка на учет объектов недвижимости",
                "Подготовка межевого плана",

            ],
        },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full">
            {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
            ))}
        </div>
    );
}

