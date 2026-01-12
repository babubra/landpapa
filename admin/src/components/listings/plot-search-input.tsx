"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Plus, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlotShortItem, PlotListItem, getPlot, searchPlots } from "@/lib/api";
import { PlotFormModal } from "@/components/plots/plot-form-modal";

interface PlotSearchInputProps {
    selectedPlots: PlotShortItem[];
    onPlotsChange: (plots: PlotShortItem[]) => void;
    listingId?: number;  // ID объявления при редактировании
}

export function PlotSearchInput({
    selectedPlots,
    onPlotsChange,
    listingId,
}: PlotSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlotShortItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Модальное окно для создания/редактирования участка
    const [plotModalOpen, setPlotModalOpen] = useState(false);
    const [initialCadastral, setInitialCadastral] = useState("");
    const [editingPlot, setEditingPlot] = useState<PlotListItem | null>(null);  // null = создание, объект = редактирование

    // Открыть модал редактирования участка
    const handleEditPlot = async (plotId: number) => {
        try {
            // Загружаем полные данные участка для редактирования
            const fullPlot = await getPlot(plotId);
            setEditingPlot(fullPlot);
            setPlotModalOpen(true);
        } catch (error) {
            console.error("Ошибка загрузки участка:", error);
        }
    };

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const found = await searchPlots(query, listingId);
                // Фильтруем уже выбранные участки
                const selectedIds = new Set(selectedPlots.map(p => p.id));
                const filtered = found.filter(p => !selectedIds.has(p.id));
                setResults(filtered);
                setShowResults(true);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, listingId, selectedPlots]);

    const addPlot = useCallback((plot: PlotShortItem) => {
        onPlotsChange([...selectedPlots, plot]);
        setQuery("");
        setResults([]);
        setShowResults(false);
    }, [selectedPlots, onPlotsChange]);

    const removePlot = useCallback((plotId: number) => {
        onPlotsChange(selectedPlots.filter(p => p.id !== plotId));
    }, [selectedPlots, onPlotsChange]);

    const handleCreateNew = () => {
        setEditingPlot(null);  // Сбрасываем редактируемый участок
        setInitialCadastral(query);
        setPlotModalOpen(true);
    };

    const handleCreateWithoutCadastral = () => {
        setEditingPlot(null);  // Сбрасываем редактируемый участок
        setInitialCadastral("");
        setPlotModalOpen(true);
    };

    // Callback после сохранения участка (создание или редактирование)
    // Примечание: PlotFormModal сам вызывает onOpenChange(false), не нужно дублировать здесь
    const handlePlotSaved = (plot: PlotListItem) => {
        // Небольшая задержка для предотвращения конфликта рендеринга
        setTimeout(() => {
            if (editingPlot) {
                // Редактирование: обновляем участок в списке
                const updatedPlots = selectedPlots.map(p =>
                    p.id === plot.id
                        ? {
                            id: plot.id,
                            cadastral_number: plot.cadastral_number,
                            area: plot.area,
                            address: plot.address,
                            price_public: plot.price_public,
                            status: plot.status,
                            land_use: plot.land_use,
                            comment: plot.comment,
                        } as PlotShortItem
                        : p
                );
                onPlotsChange(updatedPlots);
            } else {
                // Создание: добавляем новый участок
                addPlot({
                    id: plot.id,
                    cadastral_number: plot.cadastral_number,
                    area: plot.area,
                    address: plot.address,
                    price_public: plot.price_public,
                    status: plot.status,
                    land_use: plot.land_use,
                    comment: plot.comment,
                } as PlotShortItem);
            }
            setEditingPlot(null);  // Сбрасываем редактируемый участок
        }, 100);  // Увеличена задержка для надёжности
    };

    const formatArea = (area: number | null) => {
        if (!area) return "—";
        const sotki = area / 100;
        return `${sotki.toFixed(2)} сот.`;
    };

    const formatPrice = (price: number | null) => {
        if (!price) return "—";
        return new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: "RUB",
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="space-y-4">
            {/* Поиск */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по кадастровому номеру..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateWithoutCadastral}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Создать участок
                    </Button>
                </div>

                {/* Результаты поиска */}
                {showResults && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {isSearching ? (
                            <div className="p-3 text-center text-muted-foreground">
                                Поиск...
                            </div>
                        ) : results.length > 0 ? (
                            <>
                                {results.map((plot) => (
                                    <div
                                        key={plot.id}
                                        className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                        onClick={() => addPlot(plot)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-mono text-sm">
                                                {plot.cadastral_number || "Без кадастра"}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {plot.address || "Адрес не указан"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-3">
                                            <span className="text-sm text-muted-foreground">
                                                {formatArea(plot.area)}
                                            </span>
                                            <Badge variant={plot.status === "active" ? "default" : "secondary"}>
                                                {plot.status === "active" ? "В продаже" : plot.status === "sold" ? "Продан" : "Резерв"}
                                            </Badge>
                                            <Button type="button" size="sm" variant="ghost">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : query.length >= 2 ? (
                            <div className="p-3">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Участки не найдены
                                </p>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={handleCreateNew}
                                >
                                    Создать новый участок с номером "{query}"
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Click outside to close */}
            {showResults && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                />
            )}

            {/* Привязанные участки */}
            {selectedPlots.length > 0 && (
                <div className="border rounded-md">
                    <div className="px-3 py-2 bg-muted/50 border-b">
                        <span className="text-sm font-medium">
                            Привязанные участки ({selectedPlots.length})
                        </span>
                    </div>
                    <div className="divide-y">
                        {selectedPlots.map((plot, index) => (
                            <div
                                key={plot.id}
                                className="flex items-center justify-between p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground w-6">
                                        {index + 1}.
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-mono text-sm">
                                            {plot.cadastral_number || "Без кадастра"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {plot.address || "—"}
                                        </div>
                                        {plot.comment && (
                                            <div className="text-xs text-muted-foreground italic truncate max-w-[300px]" title={plot.comment}>
                                                {plot.comment}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm">
                                        {formatArea(plot.area)}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatPrice(plot.price_public)}
                                    </span>
                                    <Badge variant={plot.status === "active" ? "default" : "secondary"}>
                                        {plot.status === "active" ? "В продаже" : plot.status === "sold" ? "Продан" : "Резерв"}
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => handleEditPlot(plot.id)}
                                        title="Редактировать участок"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => removePlot(plot.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Модал создания/редактирования участка */}
            <PlotFormModal
                open={plotModalOpen}
                onOpenChange={(open) => {
                    setPlotModalOpen(open);
                    if (!open) setEditingPlot(null);  // Сброс при закрытии
                }}
                plot={editingPlot}
                initialCadastralNumber={editingPlot ? undefined : initialCadastral}
                onSuccess={handlePlotSaved}
                onPlotCreated={handlePlotSaved}
                listingId={listingId}
            />
        </div>
    );
}
