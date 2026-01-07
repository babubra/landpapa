"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationFilter } from "@/components/filters/LocationFilter";

interface Reference {
    id: number;
    code: string;
    name: string;
}

interface CatalogFiltersProps {
    onFiltersChange: (filters: Record<string, string>) => void;
    baseUrl?: string;  // По умолчанию /catalog
    total?: number;    // Количество найденных
}

export function CatalogFilters({ onFiltersChange, baseUrl = "/catalog", total }: CatalogFiltersProps) {
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
    const [sort, setSort] = useState(searchParams.get("sort") || "newest");

    // Загрузка справочника назначения
    useEffect(() => {
        fetch("/api/references?type=land_use")
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
        setSort(searchParams.get("sort") || "newest");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (settlementIds.length > 0) params.set("settlements", settlementIds.join(","));
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);
        if (sort && sort !== "newest") params.set("sort", sort);

        router.push(`${baseUrl}?${params.toString()}`);
        onFiltersChange(Object.fromEntries(params));
    }, [settlementIds, landUseId, priceMin, priceMax, areaMin, areaMax, sort, router, onFiltersChange, baseUrl]);

    // Применить фильтры с новым значением settlementIds (для LocationFilter)
    const applyFiltersWithSettlements = useCallback((newSettlementIds: number[]) => {
        const params = new URLSearchParams();
        if (newSettlementIds.length > 0) params.set("settlements", newSettlementIds.join(","));
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);
        if (sort && sort !== "newest") params.set("sort", sort);

        router.push(`${baseUrl}?${params.toString()}`);
        onFiltersChange(Object.fromEntries(params));
    }, [landUseId, priceMin, priceMax, areaMin, areaMax, sort, router, onFiltersChange, baseUrl]);

    const resetFilters = () => {
        setSettlementIds([]);
        setLandUseId("");
        setPriceMin("");
        setPriceMax("");
        setAreaMin("");
        setAreaMax("");
        setSort("newest");
        router.push(baseUrl);
        onFiltersChange({});
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Фильтры</CardTitle>
                    {total !== undefined && (
                        <span className="text-sm text-muted-foreground">
                            Объявлений: <span className="font-medium text-foreground">{total}</span>
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Местоположение */}
                <div className="space-y-2">
                    <Label>Местоположение</Label>
                    <LocationFilter
                        value={settlementIds}
                        onChange={setSettlementIds}
                        onApply={applyFiltersWithSettlements}
                        placeholder="Все районы"
                    />
                </div>

                {/* Разрешённое использование */}
                <div className="space-y-2">
                    <Label>Назначение</Label>
                    <Select value={landUseId} onValueChange={setLandUseId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Любое" />
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
                <div className="space-y-2">
                    <Label>Цена, ₽</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="от"
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder="до"
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                        />
                    </div>
                </div>

                {/* Площадь */}
                <div className="space-y-2">
                    <Label>Площадь, м²</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="от"
                            value={areaMin}
                            onChange={(e) => setAreaMin(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder="до"
                            value={areaMax}
                            onChange={(e) => setAreaMax(e.target.value)}
                        />
                    </div>
                </div>

                {/* Сортировка */}
                <div className="space-y-2">
                    <Label>Сортировка</Label>
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Сначала новые</SelectItem>
                            <SelectItem value="price_asc">Цена: по возрастанию</SelectItem>
                            <SelectItem value="price_desc">Цена: по убыванию</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Кнопки */}
                <div className="flex gap-2 pt-2">
                    <Button onClick={applyFilters} className="flex-1">
                        Применить
                    </Button>
                    <Button variant="outline" onClick={resetFilters}>
                        Сбросить
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
