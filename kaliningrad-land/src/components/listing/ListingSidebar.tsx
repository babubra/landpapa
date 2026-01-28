"use client";

import { useState } from "react";
import { Phone, MapPin, Info, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShowListingModal } from "@/components/modals/ShowListingModal";

interface Plot {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
    status: string;
}

const STATUS_LABELS: Record<string, string> = {
    reserved: "Забронирован",
};

const STATUS_STYLES: Record<string, string> = {
    reserved: "text-amber-600 bg-amber-50 border-amber-200",
};

interface ListingSidebarProps {
    phone: string;
    priceMin: number | null;
    priceMax: number | null;
    totalArea: number | null;
    areaMin: number | null;
    areaMax: number | null;
    plotsCount: number;
    landUse?: string;
    landCategory?: string;
    cadastralNumber?: string;
    location?: string;
    plots?: Plot[];
}

const ITEMS_PER_PAGE = 10;

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
    const headings = document.querySelectorAll('h2');
    headings.forEach(h => {
        if (h.textContent?.includes('Расположение')) {
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

import { useListingContext } from "@/context/ListingContext";

export function ListingSidebar({
    phone,
    priceMin,
    priceMax,
    totalArea,
    areaMin,
    areaMax,
    plotsCount,
    landUse,
    landCategory,
    cadastralNumber,
    location,
    plots,
}: ListingSidebarProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [showDisplayModal, setShowDisplayModal] = useState(false);
    const { setSelectedPlotId } = useListingContext();

    const handleCall = () => {
        window.location.href = `tel:${phone.replace(/\D/g, "")}`;
    };

    const hasMultiplePlots = plotsCount > 1 && plots && plots.length > 1;

    // Пагинация
    const allPlots = plots || [];
    const totalPages = Math.ceil(allPlots.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPlots = allPlots.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePlotClick = (plotId: number) => {
        setSelectedPlotId(plotId);
        scrollToMap();
    };

    return (
        <Card>
            <CardContent className="p-6 space-y-6">
                {/* Для нескольких участков — список */}
                {hasMultiplePlots ? (
                    <div className="space-y-4">
                        {/* Информационная надпись */}
                        <div className="bg-primary/10 rounded-lg p-3">
                            <p className="text-sm font-medium text-primary">
                                ⚡ Доступно {plotsCount} {pluralize(plotsCount, ['участок', 'участка', 'участков'])}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Выберите участок на карте ниже
                            </p>
                        </div>

                        {/* Контакт — вверху для нескольких участков */}
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
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setShowDisplayModal(true)}
                                        >
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

                        {/* Список участков */}
                        <div className="space-y-2">
                            {paginatedPlots.map((plot) => {
                                const isAvailable = plot.status === 'active';
                                const statusLabel = STATUS_LABELS[plot.status];
                                const statusStyle = STATUS_STYLES[plot.status];

                                return (
                                    <button
                                        key={plot.id}
                                        onClick={() => handlePlotClick(plot.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors group ${isAvailable ? "hover:bg-muted/50" : "opacity-80 bg-muted/20"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {plot.cadastral_number && (
                                                        <p className="font-medium text-sm truncate">
                                                            📍 {plot.cadastral_number}
                                                        </p>
                                                    )}
                                                    {statusLabel && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide whitespace-nowrap ${statusStyle}`}>
                                                            {statusLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    {plot.area && (
                                                        <span>{formatArea(plot.area)} сот.</span>
                                                    )}
                                                    {plot.area && plot.price_public && (
                                                        <span>•</span>
                                                    )}
                                                    {plot.price_public && (
                                                        <span className={`font-semibold ${isAvailable ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/50"}`}>
                                                            {formatPrice(plot.price_public)} ₽
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isAvailable && (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Управление страницами */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-2 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 px-2"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Назад
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 px-2"
                                >
                                    Вперед
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        )}
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
                                    <span className="text-muted-foreground">Площадь</span>
                                    <span className="font-medium">{formatArea(totalArea)} соток</span>
                                </div>
                            )}
                            {landUse && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Назначение</span>
                                    <span className="font-medium">{landUse}</span>
                                </div>
                            )}
                            {landCategory && (
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">Категория</span>
                                    <span className="font-medium text-right">{landCategory}</span>
                                </div>
                            )}
                            {cadastralNumber && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Кадастровый номер</span>
                                    <span className="font-medium font-mono text-sm">{cadastralNumber}</span>
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

                {/* Контакт — для одного участка внизу */}
                {!hasMultiplePlots && (
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
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setShowDisplayModal(true)}
                                    >
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
                )}

                <ShowListingModal
                    open={showDisplayModal}
                    onOpenChange={setShowDisplayModal}
                    lotInfo={cadastralNumber ? `КН ${cadastralNumber}` : undefined}
                />
            </CardContent>
        </Card>
    );
}
