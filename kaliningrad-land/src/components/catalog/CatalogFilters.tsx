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

interface District {
    id: number;
    name: string;
    slug: string;
    listings_count: number;
}

interface Settlement {
    id: number;
    name: string;
    slug: string;
    listings_count: number;
}

interface Reference {
    id: number;
    code: string;
    name: string;
}

interface CatalogFiltersProps {
    onFiltersChange: (filters: Record<string, string>) => void;
}

export function CatalogFilters({ onFiltersChange }: CatalogFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Данные для фильтров
    const [districts, setDistricts] = useState<District[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [landUseOptions, setLandUseOptions] = useState<Reference[]>([]);

    // Значения фильтров
    const [districtId, setDistrictId] = useState(searchParams.get("district") || "");
    const [settlementId, setSettlementId] = useState(searchParams.get("settlement") || "");
    const [landUseId, setLandUseId] = useState(searchParams.get("land_use") || "");
    const [priceMin, setPriceMin] = useState(searchParams.get("price_min") || "");
    const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "");
    const [areaMin, setAreaMin] = useState(searchParams.get("area_min") || "");
    const [areaMax, setAreaMax] = useState(searchParams.get("area_max") || "");
    const [sort, setSort] = useState(searchParams.get("sort") || "newest");

    // Загрузка районов
    useEffect(() => {
        fetch("http://localhost:8000/api/locations/districts")
            .then((res) => res.json())
            .then(setDistricts)
            .catch(console.error);
    }, []);

    // Загрузка населённых пунктов при выборе района
    useEffect(() => {
        if (districtId) {
            fetch(`http://localhost:8000/api/locations/settlements?district_id=${districtId}`)
                .then((res) => res.json())
                .then(setSettlements)
                .catch(console.error);
        } else {
            setSettlements([]);
            setSettlementId("");
        }
    }, [districtId]);

    // Загрузка справочника назначения
    useEffect(() => {
        fetch("http://localhost:8000/api/references?type=land_use")
            .then((res) => res.json())
            .then(setLandUseOptions)
            .catch(console.error);
    }, []);

    // Синхронизация состояния с URL (при навигации "назад")
    useEffect(() => {
        setDistrictId(searchParams.get("district") || "");
        setSettlementId(searchParams.get("settlement") || "");
        setLandUseId(searchParams.get("land_use") || "");
        setPriceMin(searchParams.get("price_min") || "");
        setPriceMax(searchParams.get("price_max") || "");
        setAreaMin(searchParams.get("area_min") || "");
        setAreaMax(searchParams.get("area_max") || "");
        setSort(searchParams.get("sort") || "newest");
    }, [searchParams]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (districtId) params.set("district", districtId);
        if (settlementId) params.set("settlement", settlementId);
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);
        if (sort && sort !== "newest") params.set("sort", sort);

        router.push(`/catalog?${params.toString()}`);
        onFiltersChange(Object.fromEntries(params));
    }, [districtId, settlementId, landUseId, priceMin, priceMax, areaMin, areaMax, sort, router, onFiltersChange]);

    const resetFilters = () => {
        setDistrictId("");
        setSettlementId("");
        setLandUseId("");
        setPriceMin("");
        setPriceMax("");
        setAreaMin("");
        setAreaMax("");
        setSort("newest");
        router.push("/catalog");
        onFiltersChange({});
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Фильтры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Район */}
                <div className="space-y-2">
                    <Label>Район</Label>
                    <Select value={districtId} onValueChange={setDistrictId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Все районы" />
                        </SelectTrigger>
                        <SelectContent>
                            {districts.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                    {d.name} ({d.listings_count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Населённый пункт */}
                {settlements.length > 0 && (
                    <div className="space-y-2">
                        <Label>Населённый пункт</Label>
                        <Select value={settlementId} onValueChange={setSettlementId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Все" />
                            </SelectTrigger>
                            <SelectContent>
                                {settlements.map((s) => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.name} ({s.listings_count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

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
