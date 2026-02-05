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
import { SmartLocationFilter, SmartSelectedLocation } from "@/components/filters/SmartLocationFilter";
import { pluralize } from "@/lib/utils";

interface Reference {
    id: number;
    code: string;
    name: string;
}

interface CatalogFiltersProps {
    onFiltersChange: (filters: Record<string, string>) => void;
    baseUrl?: string;  // По умолчанию /catalog
    locationId?: number;  // ID текущей локации из URL path
}

export function CatalogFilters({ onFiltersChange, baseUrl = "/catalog", locationId }: CatalogFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Данные для фильтров
    const [landUseOptions, setLandUseOptions] = useState<Reference[]>([]);
    const [plotsCount, setPlotsCount] = useState<number | null>(null);

    // Выбранная локация (новый SmartLocationFilter)
    const [selectedLocation, setSelectedLocation] = useState<SmartSelectedLocation | null>(null);

    // Значения фильтров
    const [landUseId, setLandUseId] = useState(searchParams.get("land_use") || "");
    const [priceMin, setPriceMin] = useState(searchParams.get("price_min") || "");
    const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "");
    const [areaMin, setAreaMin] = useState(searchParams.get("area_min") || "");
    const [areaMax, setAreaMax] = useState(searchParams.get("area_max") || "");
    const [sort, setSort] = useState(searchParams.get("sort") || "newest");

    // Загрузка справочника назначения (один раз при монтировании)
    useEffect(() => {
        fetch("/api/references/?type=land_use")
            .then((res) => res.json())
            .then(setLandUseOptions)
            .catch(console.error);
    }, []);

    // Автозаполнение локации из locationId (при переходе по гео-URL)
    useEffect(() => {
        if (locationId) {
            // Используем locationId для получения полных данных локации
            fetch(`/api/locations/${locationId}`, { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        setSelectedLocation({
                            id: data.id,
                            name: data.name,
                            slug: data.slug,
                            type: data.type,
                            settlement_type: data.settlement_type,
                            parent_slug: data.parent_slug,
                        });
                    }
                })
                .catch(console.error);
        } else {
            setSelectedLocation(null);
        }
    }, [locationId]);

    // Обратная совместимость: редирект старых URL с ?settlements= на новый формат
    useEffect(() => {
        const settlementsParam = searchParams.get("settlements");
        if (settlementsParam && !locationId) {
            // Берём первый settlement ID и получаем его локацию для редиректа
            const firstId = settlementsParam.split(",")[0];
            if (firstId) {
                fetch(`/api/locations/${firstId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.slug) {
                            // Формируем гео-URL
                            const geoUrl = data.parent_slug
                                ? `/${data.parent_slug}/${data.slug}`
                                : `/${data.slug}`;
                            // Сохраняем остальные параметры
                            const params = new URLSearchParams();
                            searchParams.forEach((value, key) => {
                                if (key !== "settlements") {
                                    params.set(key, value);
                                }
                            });
                            const queryString = params.toString();
                            router.replace(queryString ? `${geoUrl}?${queryString}` : geoUrl);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [searchParams, locationId, router]);

    // Загрузка количества участков с учётом текущих фильтров
    useEffect(() => {
        const params = new URLSearchParams();

        // Используем location_id: приоритет selectedLocation > locationId
        const locId = selectedLocation?.id || locationId;
        if (locId) {
            params.set("location_id", locId.toString());
        }

        const landUseParam = searchParams.get("land_use");
        const priceMinParam = searchParams.get("price_min");
        const priceMaxParam = searchParams.get("price_max");
        const areaMinParam = searchParams.get("area_min");
        const areaMaxParam = searchParams.get("area_max");

        if (landUseParam) params.set("land_use", landUseParam);
        if (priceMinParam) params.set("price_min", priceMinParam);
        if (priceMaxParam) params.set("price_max", priceMaxParam);
        if (areaMinParam) params.set("area_min", areaMinParam);
        if (areaMaxParam) params.set("area_max", areaMaxParam);

        const queryString = params.toString();
        const url = queryString ? `/api/public-plots/count?${queryString}` : "/api/public-plots/count";

        fetch(url)
            .then((res) => res.json())
            .then((data) => setPlotsCount(data.count))
            .catch(console.error);
    }, [searchParams, selectedLocation, locationId]);

    // Синхронизация состояния с URL (при навигации "назад")
    useEffect(() => {
        setLandUseId(searchParams.get("land_use") || "");
        setPriceMin(searchParams.get("price_min") || "");
        setPriceMax(searchParams.get("price_max") || "");
        setAreaMin(searchParams.get("area_min") || "");
        setAreaMax(searchParams.get("area_max") || "");
        setSort(searchParams.get("sort") || "newest");
    }, [searchParams]);

    // Применение остальных фильтров (локация управляется через SmartLocationFilter)
    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (landUseId) params.set("land_use", landUseId);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        if (areaMin) params.set("area_min", areaMin);
        if (areaMax) params.set("area_max", areaMax);
        if (sort && sort !== "newest") params.set("sort", sort);

        router.push(`${baseUrl}?${params.toString()}`);
        onFiltersChange(Object.fromEntries(params));
    }, [landUseId, priceMin, priceMax, areaMin, areaMax, sort, router, onFiltersChange, baseUrl]);

    // Обработчик изменения локации (SmartLocationFilter управляет URL сам при enableGeoRedirect)
    const handleLocationChange = useCallback((loc: SmartSelectedLocation | null) => {
        setSelectedLocation(loc);
        // SmartLocationFilter с enableGeoRedirect=true сам делает router.push на гео-URL
    }, []);

    const resetFilters = () => {
        setSelectedLocation(null);
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
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Фильтры</CardTitle>
                    {plotsCount !== null && (
                        <span className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{plotsCount.toLocaleString('ru-RU')}</span>{" "}
                            {pluralize(plotsCount, ['участок', 'участка', 'участков'])}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Местоположение */}
                <div className="space-y-2">
                    <Label>Местоположение</Label>
                    <SmartLocationFilter
                        value={selectedLocation}
                        onChange={handleLocationChange}
                        placeholder="Район или город"
                        enableGeoRedirect={true}
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
