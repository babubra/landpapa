"use client";

import { Phone, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ListingSidebarProps {
    phone: string;
    priceMin: number | null;
    priceMax: number | null;
    totalArea: number | null;
    plotsCount: number;
    landUse?: string;
    location?: string;
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

export function ListingSidebar({
    phone,
    priceMin,
    priceMax,
    totalArea,
    plotsCount,
    landUse,
    location,
}: ListingSidebarProps) {
    const handleCall = () => {
        window.location.href = `tel:${phone.replace(/\D/g, "")}`;
    };

    return (
        <Card>
            <CardContent className="p-6 space-y-6">
                {/* Цена */}
                <div>
                    <p className="text-3xl font-bold text-primary">
                        {formatPriceRange(priceMin, priceMax)}
                    </p>
                </div>

                {/* Характеристики */}
                <div className="space-y-3">
                    {totalArea && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Площадь</span>
                            <span className="font-medium">{formatArea(totalArea)} соток</span>
                        </div>
                    )}
                    {plotsCount > 1 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Участков</span>
                            <span className="font-medium">{plotsCount}</span>
                        </div>
                    )}
                    {landUse && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Назначение</span>
                            <span className="font-medium">{landUse}</span>
                        </div>
                    )}
                    {location && (
                        <div className="flex items-start gap-2 text-sm pt-2 border-t">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span>{location}</span>
                        </div>
                    )}
                </div>

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
