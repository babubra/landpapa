import Image from "next/image";
import { CheckCircle } from "lucide-react";

const benefits = [
    "Продажа участков из первых рук — без посредников",
    "Бесплатный вынос границ профессиональными геодезистами",
    "Топографическая съёмка — понимание высотной ситуации",
    "Информация о расположении коммуникаций",
];

export function AboutSection() {
    return (
        <section className="py-12 md:py-16">
            <div className="relative rounded-2xl overflow-hidden h-[400px] md:h-[350px]">
                {/* Фоновое изображение на всю ширину */}
                <Image
                    src="/about_us_section_image.jpg"
                    alt="Геодезист выносит границы участка"
                    fill
                    className="object-cover"
                />

                {/* Градиент справа для читабельности текста */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/60 to-transparent" />

                {/* Текст справа */}
                <div className="relative z-10 h-full flex items-center justify-end">
                    <div className="w-full md:w-1/2 lg:w-2/5 p-6 md:p-10 lg:p-12 text-white">
                        <h2 className="mb-4 text-2xl md:text-3xl text-white">
                            Покупайте напрямую — получайте больше
                        </h2>
                        <p className="text-white/80 mb-6">
                            Мы продаём земельные участки из первых рук, что позволяет
                            предложить вам лучшие условия и полную прозрачность сделки.
                        </p>

                        <ul className="space-y-3">
                            {benefits.map((benefit, index) => (
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
