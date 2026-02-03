"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Search, MapPin } from "lucide-react";
import { pluralize } from "@/lib/utils";

interface Reference {
  id: number;
  code: string;
  name: string;
}

export function SearchFilter() {
  const router = useRouter();

  // Данные из API
  const [landUseOptions, setLandUseOptions] = useState<Reference[]>([]);
  const [plotsCount, setPlotsCount] = useState<number | null>(null);

  // Выбранная локация (новый SmartLocationFilter)
  const [selectedLocation, setSelectedLocation] = useState<SmartSelectedLocation | null>(null);

  // Остальные фильтры
  const [landUseId, setLandUseId] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Загрузка справочников при монтировании
  useEffect(() => {
    fetch("/api/references/?type=land_use")
      .then((res) => res.json())
      .then(setLandUseOptions)
      .catch(console.error);
  }, []);

  // Загрузка количества участков с учётом фильтров
  useEffect(() => {
    const params = new URLSearchParams();

    // Используем location_id для новой иерархии
    if (selectedLocation) {
      params.set("location_id", selectedLocation.id.toString());
    }
    if (landUseId) params.set("land_use", landUseId);
    if (areaMin) params.set("area_min", (parseFloat(areaMin) * 100).toString());
    if (areaMax) params.set("area_max", (parseFloat(areaMax) * 100).toString());
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);

    const queryString = params.toString();
    const url = queryString ? `/api/public-plots/count?${queryString}` : "/api/public-plots/count";

    fetch(url)
      .then((res) => res.json())
      .then((data) => setPlotsCount(data.count))
      .catch(console.error);
  }, [selectedLocation, landUseId, areaMin, areaMax, priceMin, priceMax]);

  // Обработчик изменения локации
  const handleLocationChange = useCallback((loc: SmartSelectedLocation | null) => {
    setSelectedLocation(loc);
  }, []);

  // Формирование URL для фильтров (без локации)
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (landUseId) params.set("land_use", landUseId);
    if (areaMin) params.set("area_min", (parseFloat(areaMin) * 100).toString());
    if (areaMax) params.set("area_max", (parseFloat(areaMax) * 100).toString());
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);
    return params;
  }, [landUseId, areaMin, areaMax, priceMin, priceMax]);

  // Формирование гео-URL для выбранной локации
  const buildGeoPath = useCallback(() => {
    if (!selectedLocation) return "/catalog";

    // Для settlement с parent_slug: /{parent_slug}/{slug}
    // Для district/city: /{slug}
    if (selectedLocation.parent_slug) {
      return `/${selectedLocation.parent_slug}/${selectedLocation.slug}`;
    }
    return `/${selectedLocation.slug}`;
  }, [selectedLocation]);

  const handleSearch = () => {
    const basePath = buildGeoPath();
    const params = buildFilterParams();
    const queryString = params.toString();

    router.push(queryString ? `${basePath}?${queryString}` : basePath);
  };

  const handleShowOnMap = () => {
    const params = buildFilterParams();

    // Для карты используем location_id в query params
    if (selectedLocation) {
      params.set("location_id", selectedLocation.id.toString());
    }

    const queryString = params.toString();
    router.push(queryString ? `/map?${queryString}` : "/map");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {plotsCount !== null ? (
          <CardTitle className="text-lg leading-snug">
            <span className="text-muted-foreground font-normal">Выбирайте из</span>{" "}
            <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              {plotsCount.toLocaleString('ru-RU')}
            </span>{" "}
            <span className="text-muted-foreground font-normal">
              {pluralize(plotsCount, ['земельного участка', 'земельных участков', 'земельных участков'])}
            </span>
          </CardTitle>
        ) : (
          <CardTitle className="text-xl">Подобрать участок</CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Местоположение */}
        <div className="space-y-2">
          <Label>Местоположение</Label>
          <SmartLocationFilter
            value={selectedLocation}
            onChange={handleLocationChange}
            placeholder="Район или город"
          />
        </div>

        {/* Площадь */}
        <div className="space-y-2">
          <Label>Площадь, соток</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="от"
              value={areaMin}
              onChange={(e) => setAreaMin(e.target.value)}
              className="w-full"
            />
            <Input
              type="number"
              placeholder="до"
              value={areaMax}
              onChange={(e) => setAreaMax(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Назначение */}
        <div className="space-y-2">
          <Label htmlFor="landuse">Разрешённое использование</Label>
          <Select value={landUseId} onValueChange={setLandUseId}>
            <SelectTrigger id="landuse">
              <SelectValue placeholder="Любое назначение" />
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
              className="w-full"
            />
            <Input
              type="number"
              placeholder="до"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col gap-2 pt-2">
          <Button size="lg" className="w-full" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Найти участки
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleShowOnMap}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Показать на карте
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
