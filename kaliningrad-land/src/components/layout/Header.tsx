"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, Phone, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { getSiteSettings, SiteSettings, getImageUrl } from "@/lib/config";
import { CallbackModal } from "@/components/modals/CallbackModal";

const navigation = [
    { name: "Каталог", href: "/catalog" },
    { name: "Карта", href: "/map" },
    { name: "О нас", href: "/about" },
    { name: "Контакты", href: "/contacts" },
];

export function Header() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [showCallback, setShowCallback] = useState(false);
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        getSiteSettings().then(setSettings);
    }, []);

    const siteName = settings?.site_name || "";
    const siteSubtitle = settings?.site_subtitle || "";
    const sitePhone = settings?.site_phone || "";
    const phoneHref = `tel:${sitePhone.replace(/[^\d+]/g, "")}`;
    const telegramUrl = settings?.org_telegram_url || "";

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Логотип */}
                    <Link href="/" className="flex items-center space-x-2">
                        {settings?.site_logo && settings.site_logo.trim().startsWith("<svg") ? (
                            <div
                                className="h-10 w-auto text-foreground [&>svg]:h-full [&>svg]:w-auto"
                                dangerouslySetInnerHTML={{ __html: settings.site_logo }}
                            />
                        ) : null}
                        <div className="flex flex-col leading-tight">
                            <span className="text-lg font-bold text-foreground">
                                {settings?.site_name || ""}
                            </span>
                            {settings?.site_subtitle && (
                                <span className="text-xs text-muted-foreground">
                                    {settings.site_subtitle}
                                </span>
                            )}
                        </div>
                    </Link>

                    {/* Десктопная навигация */}
                    <nav className="hidden lg:flex lg:gap-x-8">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Правый блок: телефон, кнопка, тема */}
                    <div className="flex items-center gap-4">
                        {/* Telegram - скрыт на мобильных */}
                        {telegramUrl && (
                            <a
                                href={telegramUrl.startsWith("http") ? telegramUrl : `https://${telegramUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                                <span>Мы в Telegram</span>
                            </a>
                        )}

                        {/* Телефон - скрыт на мобильных */}
                        <a
                            href={phoneHref}
                            className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                            <Phone className="h-4 w-4" />
                            <span>{sitePhone}</span>
                        </a>

                        {/* Кнопка CTA */}
                        <Button className="hidden sm:inline-flex" onClick={() => setShowCallback(true)}>
                            Подберите мне участок
                        </Button>

                        {/* Переключатель темы */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="h-9 w-9"
                        >
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Переключить тему</span>
                        </Button>

                        {/* Мобильное меню */}
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild className="lg:hidden">
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Открыть меню</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80">
                                <div className="flex flex-col gap-6 px-4 pt-8">
                                    {/* Навигация */}
                                    <nav className="flex flex-col gap-4">
                                        {navigation.map((item) => (
                                            <SheetClose asChild key={item.name}>
                                                <Link
                                                    href={item.href}
                                                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                                                >
                                                    {item.name}
                                                </Link>
                                            </SheetClose>
                                        ))}
                                    </nav>

                                    {/* Telegram */}
                                    {telegramUrl && (
                                        <a
                                            href={telegramUrl.startsWith("http") ? telegramUrl : `https://${telegramUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                                        >
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                            </svg>
                                            <span>Мы в Telegram</span>
                                        </a>
                                    )}

                                    {/* Телефон */}
                                    <a
                                        href={phoneHref}
                                        className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        <Phone className="h-5 w-5" />
                                        <span>{sitePhone}</span>
                                    </a>

                                    {/* CTA кнопка */}
                                    <Button size="lg" className="w-full mt-2" onClick={() => {
                                        setIsOpen(false);
                                        setShowCallback(true);
                                    }}>
                                        Подберите мне участок
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            <CallbackModal
                open={showCallback}
                onOpenChange={setShowCallback}
            />
        </header>
    );
}
