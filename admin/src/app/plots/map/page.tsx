"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Lasso, X, Link2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { getPlotsForMap, bulkAssignPlots, PlotMapItem, PlotClusterItem, ViewportParams } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AssignListingModal } from "@/components/plots/AssignListingModal";
import { ListingFormModal } from "@/components/listings/listing-form-modal";

// Динамический импорт карты (без SSR)
const AdminPlotsMap = dynamic(
    () => import("@/components/plots/AdminPlotsMap").then((mod) => mod.AdminPlotsMap),
    { ssr: false, loading: () => <div className="w-full h-full bg-muted animate-pulse rounded-lg" /> }
);

export default function PlotsMapPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [plots, setPlots] = useState<PlotMapItem[]>([]);
    const [clusters, setClusters] = useState<PlotClusterItem[]>([]);
    const [mode, setMode] = useState<"plots" | "clusters">("plots");
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [lassoMode, setLassoMode] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [focusedPlot, setFocusedPlot] = useState<PlotMapItem | null>(null);

    // Debounce для запросов
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentViewportRef = useRef<ViewportParams | null>(null);

    // Проверка авторизации
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Загрузка участков по viewport
    const loadPlots = useCallback(async (viewport?: ViewportParams) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await getPlotsForMap(viewport);
            setPlots(response.items || []);
            setClusters(response.clusters || []);
            setMode(response.mode || "plots");
            setTotalCount(response.total || 0);
        } catch (error) {
            toast.error("Ошибка загрузки участков");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Обработчик изменения viewport с debounce
    const handleViewportChange = useCallback((viewport: ViewportParams) => {
        currentViewportRef.current = viewport;

        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(() => {
            loadPlots(viewport);
        }, 300);
    }, [loadPlots]);

    // Привязка к объявлению
    const handleAssign = async (listingId: number) => {
        const plotIds = Array.from(selectedIds);
        const result = await bulkAssignPlots(plotIds, listingId);
        toast.success(`Привязано участков: ${result.updated_count}`);
        setSelectedIds(new Set());
        // Перезагружаем с текущим viewport
        if (currentViewportRef.current) {
            loadPlots(currentViewportRef.current);
        }
    };

    // Callback после создания объявления
    const handleListingCreated = () => {
        setSelectedIds(new Set());
        setCreateModalOpen(false);
        // Перезагружаем карту с текущего viewport
        if (currentViewportRef.current) {
            loadPlots(currentViewportRef.current);
        }
    };

    // Снять выделение
    const clearSelection = () => {
        setSelectedIds(new Set());
        setFocusedPlot(null);
    };

    // Обработчик клика по участку
    const handlePlotClick = (plotId: number) => {
        const plot = plots.find(p => p.id === plotId);
        if (plot) {
            setFocusedPlot(plot);
        }
    };

    // Статистика (из текущего viewport)
    const unassignedCount = plots.filter((p) => p.listing_id === null).length;
    const assignedCount = plots.filter((p) => p.listing_id !== null).length;

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/plots")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Карта участков</h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === "clusters" ? (
                                <>
                                    В области: {totalCount} участков ({clusters.length} кластеров)
                                    <span className="text-xs ml-2">(приблизьте для просмотра)</span>
                                </>
                            ) : (
                                <>
                                    Всего: {totalCount} •
                                    <span className="text-green-600 ml-1">Без привязки: {unassignedCount}</span> •
                                    <span className="text-blue-600 ml-1">Привязано: {assignedCount}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Режим лассо (только при высоком зуме) */}
                    {mode === "plots" && (
                        <Button
                            variant={lassoMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setLassoMode(!lassoMode)}
                        >
                            <Lasso className="h-4 w-4 mr-2" />
                            {lassoMode ? "Выключить лассо" : "Лассо"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Панель выбора */}
            <div
                className={`flex items-center gap-4 px-4 py-3 bg-amber-50 dark:bg-amber-950 border-b transition-opacity ${selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <span className="text-sm font-medium">
                    Выбрано: <strong>{selectedIds.size}</strong> участков
                </span>
                <Button size="sm" onClick={() => setAssignModalOpen(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Привязать к объявлению
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreateModalOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Создать объявление
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-4 w-4 mr-2" />
                    Снять выбор
                </Button>
            </div>

            {/* Карта */}
            <div className="flex-1 relative">
                <AdminPlotsMap
                    plots={plots}
                    clusters={clusters}
                    mode={mode}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onPlotClick={handlePlotClick}
                    onViewportChange={handleViewportChange}
                    lassoMode={lassoMode}
                />
                {isLoading && (
                    <div className="absolute top-2 right-2 bg-white/80 rounded px-3 py-1 text-sm z-[1000]">
                        Загрузка...
                    </div>
                )}
            </div>

            {/* Легенда */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 text-sm z-[1000]">
                <div className="font-medium mb-2">Легенда:</div>
                {mode === "clusters" ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500" />
                        <span>Кластер участков</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded bg-green-500" />
                            <span>Без привязки</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded bg-blue-500" />
                            <span>Привязан к объявлению</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-amber-500" />
                            <span>Выбран</span>
                        </div>
                    </>
                )}
            </div>

            {/* Подсказка */}
            <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 text-sm max-w-xs z-[1000]">
                <div className="font-medium mb-1">Управление:</div>
                <ul className="text-muted-foreground text-xs space-y-1">
                    {mode === "clusters" ? (
                        <li>• Клик на кластер — приблизить</li>
                    ) : (
                        <>
                            <li>• Клик — выбрать участок</li>
                            <li>• Ctrl/Cmd + клик — мультивыбор</li>
                            <li>• Лассо — обвести область</li>
                        </>
                    )}
                </ul>
            </div>

            {/* Информационная панель участка */}
            {focusedPlot && mode === "plots" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 z-[1000] min-w-[350px] max-w-md">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="font-mono text-sm font-medium">
                                {focusedPlot.cadastral_number || '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {focusedPlot.address || 'Адрес не указан'}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFocusedPlot(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                            <div className="text-muted-foreground text-xs">Цена</div>
                            <div className="font-medium">
                                {focusedPlot.price_public
                                    ? `${focusedPlot.price_public.toLocaleString('ru-RU')} ₽`
                                    : '—'
                                }
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground text-xs">Площадь</div>
                            <div className="font-medium">
                                {focusedPlot.area
                                    ? `${(focusedPlot.area / 100).toFixed(2)} сот.`
                                    : '—'
                                }
                            </div>
                        </div>
                    </div>
                    {focusedPlot.comment && (
                        <div className="text-sm mb-3">
                            <div className="text-muted-foreground text-xs">Комментарий</div>
                            <div>{focusedPlot.comment}</div>
                        </div>
                    )}
                    {focusedPlot.listing ? (
                        <Link
                            href={`/listings?edit=${focusedPlot.listing.id}`}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {focusedPlot.listing.title}
                        </Link>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Не привязан к объявлению
                        </div>
                    )}
                </div>
            )}

            {/* Модальное окно привязки */}
            <AssignListingModal
                open={assignModalOpen}
                onOpenChange={setAssignModalOpen}
                selectedCount={selectedIds.size}
                onAssign={handleAssign}
            />

            {/* Модальное окно создания объявления */}
            <ListingFormModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                initialPlotIds={Array.from(selectedIds)}
                onSuccess={handleListingCreated}
            />
        </div>
    );
}
