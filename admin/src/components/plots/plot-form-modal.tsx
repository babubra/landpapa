"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
    PlotListItem,
    PlotCreate,
    createPlot,
    updatePlot,
    getReferences,
    fetchGeometry,
    checkCadastralNumber,
    CadastralCheckResult,
    Reference,
} from "@/lib/api";

interface PlotFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plot?: PlotListItem | null; // null = создание, объект = редактирование
    onSuccess?: (plot: PlotListItem) => void;
    // Новые пропсы для использования из формы объявления
    initialCadastralNumber?: string;  // Предзаполнение кадастрового номера
    onPlotCreated?: (plot: PlotListItem) => void;  // Callback после создания (для привязки к объявлению)
    listingId?: number;  // ID объявления для автоматической привязки при создании
}

export function PlotFormModal({
    open,
    onOpenChange,
    plot,
    onSuccess,
    initialCadastralNumber,
    onPlotCreated,
    listingId,
}: PlotFormModalProps) {
    const isEditing = !!plot;

    // Форма
    const [cadastralNumber, setCadastralNumber] = useState("");
    const [area, setArea] = useState("");
    const [address, setAddress] = useState("");
    const [pricePublic, setPricePublic] = useState("");
    const [pricePerSotka, setPricePerSotka] = useState("");
    const [pricePrivate, setPricePrivate] = useState("");
    const [status, setStatus] = useState<"active" | "sold" | "reserved">("active");
    const [landUseId, setLandUseId] = useState<string>("");
    const [landCategoryId, setLandCategoryId] = useState<string>("");

    // Координаты
    const [hasGeometry, setHasGeometry] = useState(false);
    const [centroidCoords, setCentroidCoords] = useState<[number, number] | null>(null);
    const [isLoadingNspd, setIsLoadingNspd] = useState(false);

    // Справочники
    const [landUses, setLandUses] = useState<Reference[]>([]);
    const [landCategories, setLandCategories] = useState<Reference[]>([]);

    // Состояние
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingRefs, setIsLoadingRefs] = useState(false);

    // Предупреждение о дубликате
    const [duplicateWarning, setDuplicateWarning] = useState<CadastralCheckResult | null>(null);
    const [forceCreate, setForceCreate] = useState(false);

    // Загрузка справочников
    useEffect(() => {
        if (open) {
            setIsLoadingRefs(true);
            Promise.all([
                getReferences("land_use"),
                getReferences("land_category"),
            ])
                .then(([uses, categories]) => {
                    setLandUses(uses);
                    setLandCategories(categories);
                })
                .catch(() => {
                    toast.error("Ошибка загрузки справочников");
                })
                .finally(() => {
                    setIsLoadingRefs(false);
                });
        }
    }, [open]);

    // Заполнение формы при редактировании
    useEffect(() => {
        if (plot) {
            setCadastralNumber(plot.cadastral_number || "");
            setArea(plot.area ? String(plot.area / 100) : ""); // Сотки
            setAddress(plot.address || "");
            setPricePublic(plot.price_public ? String(plot.price_public) : "");
            setPricePerSotka(plot.price_per_sotka ? String(plot.price_per_sotka) : "");
            setPricePrivate("");
            setStatus(plot.status);
            setLandUseId(plot.land_use?.id ? String(plot.land_use.id) : "");
            setLandCategoryId(plot.land_category?.id ? String(plot.land_category.id) : "");
            setHasGeometry(plot.has_geometry || false);
            setCentroidCoords(plot.centroid_coords || null);
        } else {
            // Сброс формы
            setCadastralNumber("");
            setArea("");
            setAddress("");
            setPricePublic("");
            setPricePerSotka("");
            setPricePrivate("");
            setStatus("active");
            setLandUseId("");
            setLandCategoryId("");
            setHasGeometry(false);
            setCentroidCoords(null);
        }
    }, [plot, open]);

    // Применяем initialCadastralNumber при открытии модала для создания
    useEffect(() => {
        if (open && !plot && initialCadastralNumber) {
            setCadastralNumber(initialCadastralNumber);
        }
    }, [open, plot, initialCadastralNumber]);

    // Автоматический расчёт цены за сотку
    useEffect(() => {
        const areaNum = parseFloat(area);
        const priceNum = parseFloat(pricePublic);
        if (areaNum > 0 && priceNum > 0) {
            setPricePerSotka(String(Math.round(priceNum / areaNum)));
        }
    }, [area, pricePublic]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Проверка дубликата кадастрового номера (только при создании)
            if (!isEditing && cadastralNumber && !forceCreate) {
                const check = await checkCadastralNumber(cadastralNumber);
                if (check.exists) {
                    setDuplicateWarning(check);
                    setIsLoading(false);
                    return;
                }
            }

            // Сбрасываем предупреждение
            setDuplicateWarning(null);
            setForceCreate(false);
            const data: PlotCreate = {
                cadastral_number: cadastralNumber?.trim() || null,
                area: area ? parseFloat(area) * 100 : null, // Сотки → м²
                address: address?.trim() || null,
                price_public: pricePublic ? parseInt(pricePublic) : null,
                price_per_sotka: pricePerSotka ? parseInt(pricePerSotka) : null,
                price_private: pricePrivate ? parseInt(pricePrivate) : null,
                status,
                land_use_id: landUseId ? parseInt(landUseId) : null,
                land_category_id: landCategoryId ? parseInt(landCategoryId) : null,
                listing_id: listingId || null,  // Привязка к объявлению при создании
            };

            let result: PlotListItem;

            if (isEditing && plot) {
                result = await updatePlot(plot.id, data);
                toast.success("Участок обновлён");
            } else {
                result = await createPlot(data);
                toast.success("Участок создан");

                // Автоматически получаем координаты если есть кадастровый номер
                if (cadastralNumber && result.id) {
                    try {
                        toast.info("Получаем координаты из NSPD...");
                        const updated = await fetchGeometry(result.id);
                        result = updated;
                        if (updated.has_geometry) {
                            toast.success("Координаты успешно загружены");
                        }
                    } catch (geoError: any) {
                        // Не критичная ошибка — участок уже создан
                        toast.warning("Участок создан, но координаты не получены: " + (geoError.message || ""));
                    }
                }
            }

            onSuccess?.(result);
            onPlotCreated?.(result);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Редактирование участка" : "Новый участок"}
                    </DialogTitle>
                </DialogHeader>

                {/* Предупреждение о дубликате */}
                {duplicateWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-amber-600 dark:text-amber-400 text-xl">⚠️</div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                                    Участок с таким кадастровым номером уже существует
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    ID: {duplicateWarning.plot_id}
                                    {duplicateWarning.address && ` • ${duplicateWarning.address}`}
                                    {duplicateWarning.status && ` • Статус: ${duplicateWarning.status}`}
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setDuplicateWarning(null);
                                            setForceCreate(false);
                                        }}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            setForceCreate(true);
                                            setDuplicateWarning(null);
                                            // Повторно отправляем форму
                                            const form = document.querySelector('form');
                                            form?.requestSubmit();
                                        }}
                                    >
                                        Всё равно создать
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ссылка на объявление (если участок привязан) */}
                {isEditing && plot?.listing && (
                    <div className="bg-muted/50 border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm text-muted-foreground">Объявление:</span>
                                <span className="ml-2 font-medium">{plot.listing.title}</span>
                            </div>
                            <Link
                                href={`/listings?edit=${plot.listing.id}`}
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                onClick={() => onOpenChange(false)}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Открыть
                            </Link>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Адрес */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Адрес</Label>
                        <Input
                            id="address"
                            placeholder="пос. Янтарный, ул. Советская, участок 15"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    {/* Кадастр и площадь */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cadastral">Кадастровый номер</Label>
                            <Input
                                id="cadastral"
                                placeholder="39:05:010101:123"
                                value={cadastralNumber}
                                onChange={(e) => setCadastralNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Площадь (сотки)</Label>
                            <Input
                                id="area"
                                type="number"
                                step="0.01"
                                placeholder="10"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Координаты */}
                    <div className="space-y-2">
                        <Label>Координаты участка</Label>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 px-3 py-2 rounded-md border bg-muted text-sm">
                                {hasGeometry ? (
                                    <span className="text-green-600 flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Координаты загружены
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Координаты не заданы</span>
                                )}
                            </div>
                            {centroidCoords && (
                                <div className="px-3 py-2 rounded-md border bg-muted text-sm font-mono">
                                    📍 {centroidCoords[1].toFixed(6)}, {centroidCoords[0].toFixed(6)}
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!plot || !cadastralNumber || isLoadingNspd}
                                onClick={async () => {
                                    if (!plot) {
                                        toast.error("Сначала сохраните участок");
                                        return;
                                    }
                                    setIsLoadingNspd(true);
                                    try {
                                        const updated = await fetchGeometry(plot.id);
                                        setHasGeometry(updated.has_geometry);
                                        setCentroidCoords(updated.centroid_coords || null);
                                        if (updated.address && !address) {
                                            setAddress(updated.address);
                                        }
                                        if (updated.area && !area) {
                                            setArea(String(updated.area / 100));
                                        }
                                        toast.success("Координаты успешно получены из NSPD");
                                    } catch (error: any) {
                                        toast.error(error.message || "Ошибка получения координат");
                                    } finally {
                                        setIsLoadingNspd(false);
                                    }
                                }}
                            >
                                {isLoadingNspd ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Получить из NSPD
                            </Button>
                        </div>
                        {!cadastralNumber && (
                            <p className="text-xs text-muted-foreground">
                                Введите кадастровый номер для получения координат
                            </p>
                        )}
                    </div>

                    {/* Цены */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Цена (₽)</Label>
                            <Input
                                id="price"
                                type="number"
                                placeholder="2000000"
                                value={pricePublic}
                                onChange={(e) => setPricePublic(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pricePerSotka">Цена за сотку (₽)</Label>
                            <Input
                                id="pricePerSotka"
                                type="number"
                                placeholder="200000"
                                value={pricePerSotka}
                                onChange={(e) => setPricePerSotka(e.target.value)}
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pricePrivate">Приватная цена (₽)</Label>
                            <Input
                                id="pricePrivate"
                                type="number"
                                placeholder="1800000"
                                value={pricePrivate}
                                onChange={(e) => setPricePrivate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Статус и справочники */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Статус</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">В продаже</SelectItem>
                                    <SelectItem value="sold">Продан</SelectItem>
                                    <SelectItem value="reserved">Резерв</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Назначение</Label>
                            <Select
                                value={landUseId}
                                onValueChange={setLandUseId}
                                disabled={isLoadingRefs}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {landUses.map((ref) => (
                                        <SelectItem key={ref.id} value={String(ref.id)}>
                                            {ref.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Категория</Label>
                            <Select
                                value={landCategoryId}
                                onValueChange={setLandCategoryId}
                                disabled={isLoadingRefs}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {landCategories.map((ref) => (
                                        <SelectItem key={ref.id} value={String(ref.id)}>
                                            {ref.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Сохранить" : "Создать"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
