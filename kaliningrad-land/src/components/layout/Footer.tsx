import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

const navigation = [
    { name: "Каталог", href: "/catalog" },
    { name: "Карта", href: "/map" },
    { name: "О нас", href: "/about" },
    { name: "Контакты", href: "/contacts" },
];

export function Footer() {
    return (
        <footer className="border-t bg-muted/50">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Логотип и описание */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                <span className="text-xl font-bold text-primary-foreground">К</span>
                            </div>
                            <span className="text-lg font-bold text-foreground">
                                КалининградЗем
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Продажа земельных участков в Калининградской области.
                            Помогаем найти идеальный участок для вашего дома или бизнеса.
                        </p>
                    </div>

                    {/* Навигация */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Навигация
                        </h3>
                        <ul className="space-y-3">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Контакты */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Контакты
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <a
                                    href="tel:+74012123456"
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Phone className="h-4 w-4" />
                                    +7 (4012) 12-34-56
                                </a>
                            </li>
                            <li>
                                <a
                                    href="mailto:info@kaliningrad-zem.ru"
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Mail className="h-4 w-4" />
                                    info@kaliningrad-zem.ru
                                </a>
                            </li>
                            <li>
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>г. Калининград, ул. Примерная, д. 1</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Режим работы */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Режим работы
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Пн–Пт: 9:00 – 18:00</li>
                            <li>Сб: 10:00 – 16:00</li>
                            <li>Вс: выходной</li>
                        </ul>
                    </div>
                </div>

                {/* Копирайт */}
                <div className="mt-12 border-t pt-8">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} КалининградЗем. Все права защищены.
                    </p>
                </div>
            </div>
        </footer>
    );
}
