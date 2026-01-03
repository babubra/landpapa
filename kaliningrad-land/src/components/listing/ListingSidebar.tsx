"use client";

import { Phone, MapPin, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
}

interface ListingSidebarProps {
    phone: string;
    priceMin: number | null;
    priceMax: number | null;
    totalArea: number | null;
    areaMin: number | null;
    areaMax: number | null;
    plotsCount: number;
    landUse?: string;
    location?: string;
    plots?: Plot[];  // Новый пропс для списка участков
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ru-RU").format(price);
}

function formatArea(m2: number): string {
    return (m2 / 100).toFixed(1);
}

function formatPriceRange(min: number | null, max: number | null): string {
    if (!min && !max) return "Цена по запросу";
    if (min === max || !max) return `${formatPrice(min!)} ₽`;
    return `от ${formatPrice(min!)} до ${formatPrice(max!)} ₽`;
}

function scrollToMap() {
    const mapSection = document.querySelector('h2');
    if (mapSection) {
        // Ищем заголовок "Расположение на карте"
        const headings = document.querySelectorAll('h2');
        headings.forEach(h => {
            if (h.textContent?.includes('Расположение')) {
                h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

export function ListingSidebar({
    phone,
    priceMin,
    priceMax,
    totalArea,
    areaMin,
    areaMax,
    plotsCount,
    landUse,
    location,
    plots,
}: ListingSidebarProps) {
    const handleCall = () => {
        window.location.href = `tel:${phone.replace(/\D/g, "")}`;
    };

    const hasMultiplePlots = plotsCount > 1 && plots && plots.length > 1;

    return (
        <Card>
            <CardContent className="p-6 space-y-6">
                {/* Для нескольких участков — список */}
                {hasMultiplePlots ? (
                    <div className="space-y-4">
                        {/* Информационная надпись */}
                        <div className="bg-primary/10 rounded-lg p-3">
                            <p className="text-sm font-medium text-primary">
                                ⚡ Доступно {plotsCount} участка
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Выберите участок на карте ниже
                            </p>
                        </div>

                        {/* Список участков */}
                        <div className="space-y-2">
                            {plots.map((plot) => (
                                <button
                                    key={plot.id}
                                    onClick={scrollToMap}
                                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            {plot.cadastral_number && (
                                                <p className="font-medium text-sm">
                                                    📍 {plot.cadastral_number}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {plot.area && (
                                                    <span>{formatArea(plot.area)} сот.</span>
                                                )}
                                                {plot.area && plot.price_public && (
                                                    <span>•</span>
                                                )}
                                                {plot.price_public && (
                                                    <span className="font-semibold text-foreground">
                                                        {formatPrice(plot.price_public)} ₽
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Цена (для 1 участка) */}
                        <div>
                            <p className="text-3xl font-bold text-primary">
                                {formatPriceRange(priceMin, priceMax)}
                            </p>
                        </div>

                        {/* Характеристики */}
                        <div className="space-y-3">
                            {totalArea && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Площадь участков</span>
                                    <span className="font-medium">{formatArea(totalArea)} соток</span>
                                </div>
                            )}
                            {landUse && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Назначение</span>
                                    <span className="font-medium">{landUse}</span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Локация (всегда показываем) */}
                {location && (
                    <div className="flex items-start gap-2 text-sm pt-2 border-t">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span>{location}</span>
                    </div>
                )}

                {/* Контакт */}
                <div className="space-y-3 pt-4 border-t">
                    <p className="text-lg font-semibold flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        {phone}
                    </p>

                    <Button size="lg" className="w-full" onClick={handleCall}>
                        <Phone className="h-4 w-4 mr-2" />
                        Позвонить
                    </Button>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="lg" variant="outline" className="w-full">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Покажите мне участок
                                    <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-center">
                                <p>
                                    Наш представитель покажет вам участок на местности и ответит
                                    на все ваши вопросы
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}
