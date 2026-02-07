"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useListingContext } from "@/context/ListingContext";
import { Navigation, X, Map as MapIcon } from "lucide-react";
import type { PlotForMap } from "./ListingMap";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

const ListingMap = dynamic(
    () => import("./ListingMap").then((mod) => mod.ListingMap),
    {
        ssr: false,
        loading: () => (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка карты...</p>
            </div>
        ),
    }
);

interface ListingMapClientProps {
    plots: PlotForMap[];
}

const STATUS_LABELS: Record<string, string> = {
    active: "В продаже",
    reserved: "Забронирован",
    sold: "Продан",
};

const STATUS_COLORS: Record<string, string> = {
    active: "#10b981",    // Emerald-500
    reserved: "#f59e0b",  // Amber-500
    sold: "#ef4444",      // Red-500
};

// Функция для получения центра полигона
function getPolygonCenter(polygon: [number, number][]): [number, number] {
    const lats = polygon.map(c => c[0]);
    const lngs = polygon.map(c => c[1]);
    return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
}

export function ListingMapClient({ plots }: ListingMapClientProps) {
    const isMobile = useIsMobile();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { selectedPlotId, setSelectedPlotId } = useListingContext();
    const selectedPlot = plots.find((p) => p.id === selectedPlotId);

    // Фильтруем участки с координатами для определения "единственного"
    const plotsWithCoords = plots.filter(
        (p) => (p.polygon && p.polygon.length > 0) || (p.latitude && p.longitude)
    );
    const isSinglePlot = plotsWithCoords.length === 1;

    // Автоматически выбираем участок, если он единственный
    useEffect(() => {
        if (isSinglePlot && !selectedPlotId) {
            setSelectedPlotId(plotsWithCoords[0].id);
        }
    }, [isSinglePlot, selectedPlotId, setSelectedPlotId, plotsWithCoords]);

    const handleClose = () => {
        // Не закрываем, если участок единственный
        if (isSinglePlot) return;
        setSelectedPlotId(null);
    };

    // Calculate coordinates safely
    const getCoordinates = () => {
        if (!selectedPlot) return null;

        let lat = selectedPlot.latitude;
        let lng = selectedPlot.longitude;

        if ((!lat || !lng) && selectedPlot.polygon && selectedPlot.polygon.length > 0) {
            const center = getPolygonCenter(selectedPlot.polygon);
            lat = center[0];
            lng = center[1];
        }

        if (lat && lng) return { lat, lng };
        return null;
    };

    const handleRouteClick = () => {
        if (!selectedPlot) return;

        if (isMobile) {
            setIsSheetOpen(true);
        } else {
            const coords = getCoordinates();
            if (coords) {
                window.open(`https://yandex.ru/maps/?pt=${coords.lng},${coords.lat}&z=16&l=map&rtext=~${coords.lat},${coords.lng}&rtt=auto`, '_blank');
            }
        }
    };

    const handleMobileNavigation = (app: 'yandex' | '2gis') => {
        const coords = getCoordinates();
        if (!coords) return;

        let url = '';
        if (app === 'yandex') {
            url = `yandexmaps://build_route_on_map?lat_to=${coords.lat}&lon_to=${coords.lng}`;
        } else if (app === '2gis') {
            // 2GIS format: lon, lat
            url = `dgis://2gis.ru/routeSearch/rsType/car/to/${coords.lng},${coords.lat}`;
        }

        window.location.href = url;
        setIsSheetOpen(false);
    };

    return (
        <div className="space-y-4" id="map-section">
            {/* Контейнер с фиксированной высотой для предотвращения скачков (96px) */}
            <div className="h-24 flex items-center">
                {selectedPlot ? (
                    <div className="w-full h-full bg-card rounded-lg border px-3 py-2 sm:px-6 sm:py-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col justify-center gap-0.5 sm:gap-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="font-bold text-lg sm:text-2xl text-foreground whitespace-nowrap">
                                    {selectedPlot.price_public
                                        ? new Intl.NumberFormat("ru-RU").format(selectedPlot.price_public) + " ₽"
                                        : "Цена по запросу"
                                    }
                                </span>
                                {selectedPlot.area && (
                                    <span className="text-muted-foreground text-sm sm:text-lg border-l pl-2 sm:pl-3 border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                        {(selectedPlot.area / 100).toFixed(1)} сот.
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm overflow-hidden text-ellipsis">
                                <span style={{ color: STATUS_COLORS[selectedPlot.status] }} className="font-bold flex items-center gap-1 uppercase tracking-wide whitespace-nowrap flex-shrink-0">
                                    ● {STATUS_LABELS[selectedPlot.status] || selectedPlot.status}
                                </span>
                                {selectedPlot.cadastral_number && (
                                    <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono truncate">
                                        {selectedPlot.cadastral_number}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                            <button
                                className="flex items-center gap-1.5 sm:gap-2 bg-[#10b981] hover:bg-[#059669] text-white text-sm sm:text-base font-medium py-2 px-3 sm:py-2.5 sm:px-5 rounded-md transition-colors shadow-sm whitespace-nowrap"
                                onClick={handleRouteClick}
                            >
                                <Navigation className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="sm:hidden">Маршрут</span>
                                <span className="hidden sm:inline">Проложить маршрут</span>
                            </button>
                            {/* Кнопка закрытия — только если участков больше одного */}
                            {!isSinglePlot && (
                                <button
                                    onClick={handleClose}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 sm:p-2 hover:bg-muted rounded-full"
                                    aria-label="Закрыть"
                                >
                                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center">
                        <h2 className="text-lg sm:text-2xl font-bold">Расположение на карте</h2>
                    </div>
                )}
            </div>

            <ListingMap plots={plots} />

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="bottom" className="pb-8">
                    <SheetHeader className="mb-4 text-left">
                        <SheetTitle>Построить маршрут</SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-3">
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full justify-start gap-3 h-14 text-base"
                            onClick={() => handleMobileNavigation('yandex')}
                        >
                            <Navigation className="h-5 w-5 text-red-500" />
                            Яндекс Навигатор
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full justify-start gap-3 h-14 text-base"
                            onClick={() => handleMobileNavigation('2gis')}
                        >
                            <MapIcon className="h-5 w-5 text-green-500" />
                            2ГИС
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
