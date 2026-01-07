import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { getSiteSettings } from "@/lib/config";

const navigation = [
    { name: "Каталог", href: "/catalog" },
    { name: "Карта", href: "/map" },
    { name: "О нас", href: "/about" },
    { name: "Контакты", href: "/contacts" },
];

export async function Footer() {
    const settings = await getSiteSettings();

    const siteName = settings.site_name || "КалининградЗем";
    const siteSubtitle = settings.site_subtitle || "";
    const sitePhone = settings.site_phone || "+7 (4012) 12-34-56";
    const siteEmail = settings.site_email || "info@kaliningrad-zem.ru";
    const siteAddress = settings.site_address || "г. Калининград, ул. Примерная, д. 1";
    const workHoursWeekdays = settings.site_work_hours_weekdays || "Пн–Пт: 9:00 – 18:00";
    const workHoursWeekend = settings.site_work_hours_weekend || "Сб: 10:00 – 16:00, Вс: выходной";

    const phoneHref = `tel:${sitePhone.replace(/[^\d+]/g, "")}`;
    const mailHref = `mailto:${siteEmail}`;

    return (
        <footer className="border-t bg-muted/50">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Логотип и описание */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-2">
                            {settings.site_logo && settings.site_logo.trim().startsWith("<svg") ? (
                                <div
                                    className="h-10 w-auto text-foreground [&>svg]:h-full [&>svg]:w-auto"
                                    dangerouslySetInnerHTML={{ __html: settings.site_logo }}
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                    <span className="text-xl font-bold text-primary-foreground">
                                        {siteName.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col leading-tight">
                                <span className="text-lg font-bold text-foreground">
                                    {siteName}
                                </span>
                                {siteSubtitle && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                        {siteSubtitle}
                                    </span>
                                )}
                            </div>
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
                                    href={phoneHref}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Phone className="h-4 w-4" />
                                    {sitePhone}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={mailHref}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Mail className="h-4 w-4" />
                                    {siteEmail}
                                </a>
                            </li>
                            <li>
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{siteAddress}</span>
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
                            <li>{workHoursWeekdays}</li>
                            {workHoursWeekend.split(',').map((part, idx) => (
                                <li key={idx}>{part.trim()}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Копирайт */}
                <div className="mt-12 border-t pt-8">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} {siteName}. Все права защищены.
                    </p>
                </div>
            </div>
        </footer>
    );
}
