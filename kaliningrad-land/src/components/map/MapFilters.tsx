"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { LocationFilter } from "@/components/filters/LocationFilter";
import { Filter, List, X } from "lucide-react";

interface Reference {
    id: number;
    code: string;
    name: string;
}

interface MapFiltersProps {
    onFiltersChange: () => void;
    total: number;
    isMobile?: boolean;
}

/**
 * Компактная горизонтальная панель фильтров для страницы карты.
 * На мобильных устройствах сворачивается в кнопку.
 */
export function MapFilters({ onFiltersChange, total, isMobile = false }: MapFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Данные для фильтров
    const [landUseOptions, setLandUseOptions] = useState<Reference[]>([]);

    // Парсинг settlements из URL
    const parseSettlementsFromUrl = (): number[] => {
        const param = searchParams.get("settlements");
        if (!param) return [];
        return param.split(",").map(Number).filter(Boolean);
    };

    // Значения фильтров
    const [settlementIds, setSettlementIds] = useState<number[]>(parseSettlementsFromUrl());
    const [landUseId, setLandUseId] = useState(searchParams.get("land_use") || "");
    const [priceMin, setPriceMin] = useState(searchParams.get("price_min") || "");
    const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "");
    const [areaMin, setAreaMin] = useState(searchParams.get("area_min") || "");
    const [areaMax, setAreaMax] = useState(searchParams.get("area_max") || "");

    // Состояние мобильного Sheet
    const [sheetOpen, setSheetOpen] = useState(false);

    // Загрузка справочника назначения
    useEffect(() => {
        fetch("/api/references/?type=land_use")
            .then((res) => res.json())
            .then(setLandUseOptions)
            .catch(console.error);
    }, []);

    // Синхронизация состояния с URL (при навигации "назад")
    useEffect(() => {
        setSettlementIds(parseSettlementsFromUrl());
        setLandUseId(searchParams.get("land_use") || "");
        setPriceMin(searchParams.get("price_min") || "");
        setPriceMax(searchParams.get("price_max") || "");
        setAreaMin(searchParams.get("area_min") || "");
        setAreaMax(searchParams.get("area_max") || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Построить URL с текущими фильтрами
    const buildFilterParams = useCallback(() => {
        const params = new URLSearchParams();
        if (settlementIds.length > 0) params.set("settlements", settlementIds.join(","));
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);
        return params;
    }, [settlementIds, landUseId, priceMin, priceMax, areaMin, areaMax]);

    const applyFilters = useCallback(() => {
        const params = buildFilterParams();
        router.push(`/map?${params.toString()}`);
        onFiltersChange();
        setSheetOpen(false); // Закрыть мобильный Sheet
    }, [buildFilterParams, router, onFiltersChange]);

    // Применить фильтры с новым значением settlementIds
    const applyFiltersWithSettlements = useCallback((newSettlementIds: number[]) => {
        const params = new URLSearchParams();
        if (newSettlementIds.length > 0) params.set("settlements", newSettlementIds.join(","));
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);

        router.push(`/map?${params.toString()}`);
        onFiltersChange();
    }, [landUseId, priceMin, priceMax, areaMin, areaMax, router, onFiltersChange]);

    const resetFilters = () => {
        setSettlementIds([]);
        setLandUseId("");
        setPriceMin("");
        setPriceMax("");
        setAreaMin("");
        setAreaMax("");
        router.push("/map");
        onFiltersChange();
        setSheetOpen(false); // Закрыть мобильный Sheet
    };

    // Подсчёт активных фильтров
    const activeFiltersCount = [
        settlementIds.length > 0,
        landUseId,
        priceMin,
        priceMax,
        areaMin,
        areaMax,
    ].filter(Boolean).length;

    // Ссылка на каталог с текущими фильтрами
    const catalogUrl = `/catalog?${buildFilterParams().toString()}`;

    // Содержимое фильтров (переиспользуется в desktop и mobile)
    const FiltersContent = ({ inSheet = false }: { inSheet?: boolean }) => (
        <div className={inSheet ? "space-y-4 px-4" : "flex items-center gap-2 flex-wrap"}>
            {/* Местоположение */}
            <div className={inSheet ? "space-y-1" : "w-40"}>
                {inSheet && <label className="text-sm font-medium">Местоположение</label>}
                <LocationFilter
                    value={settlementIds}
                    onChange={setSettlementIds}
                    onApply={applyFiltersWithSettlements}
                    placeholder="Район"
                    fullWidth={true}
                />
            </div>

            {/* Назначение */}
            <div className={inSheet ? "space-y-1" : "w-36"}>
                {inSheet && <label className="text-sm font-medium">Назначение</label>}
                <Select value={landUseId} onValueChange={setLandUseId}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="Назначение" />
                    </SelectTrigger>
                    <SelectContent>
                        {landUseOptions.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                                {r.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Цена */}
            <div className={inSheet ? "space-y-1" : "flex items-center gap-1"}>
                {inSheet && <label className="text-sm font-medium">Цена, ₽</label>}
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        placeholder="Цена от"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="h-9 w-24"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                        type="number"
                        placeholder="до"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="h-9 w-24"
                    />
                </div>
            </div>

            {/* Площадь */}
            <div className={inSheet ? "space-y-1" : "flex items-center gap-1"}>
                {inSheet && <label className="text-sm font-medium">Площадь, м²</label>}
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        placeholder="Площадь от"
                        value={areaMin}
                        onChange={(e) => setAreaMin(e.target.value)}
                        className="h-9 w-24"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                        type="number"
                        placeholder="до"
                        value={areaMax}
                        onChange={(e) => setAreaMax(e.target.value)}
                        className="h-9 w-24"
                    />
                </div>
            </div>

            {/* Кнопки */}
            <div className={inSheet ? "flex gap-2 pt-2" : "flex items-center gap-2"}>
                <Button onClick={applyFilters} size="sm" className="h-9">
                    Применить
                </Button>
                {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
                        <X className="h-4 w-4 mr-1" />
                        Сбросить
                    </Button>
                )}
            </div>
        </div>
    );

    // Мобильная версия — кнопка + Sheet
    if (isMobile) {
        return (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background relative z-50">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                            <Filter className="h-4 w-4 mr-2" />
                            Фильтры
                            {activeFiltersCount > 0 && (
                                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto max-h-[50vh]">
                        <SheetHeader className="px-4">
                            <SheetTitle>Фильтры</SheetTitle>
                        </SheetHeader>
                        <div className="py-2 pb-6">
                            <FiltersContent inSheet={true} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Счётчик и кнопка списком */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {total} участков
                    </span>
                    <Button variant="outline" size="sm" asChild className="h-9">
                        <Link href={catalogUrl}>
                            <List className="h-4 w-4 mr-1" />
                            Списком
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Desktop версия — горизонтальная панель
    return (
        <div className="border-b bg-background relative z-50">
            <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
                <FiltersContent />

                {/* Счётчик и кнопка списком */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Найдено: <span className="font-medium text-foreground">{total}</span> участков
                    </span>
                    <Button variant="outline" size="sm" asChild className="h-9">
                        <Link href={catalogUrl}>
                            <List className="h-4 w-4 mr-1" />
                            Показать списком
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
