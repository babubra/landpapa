"use client";

import { useState, useEffect } from "react";
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
import { LocationFilter } from "@/components/filters/LocationFilter";
import { Search, MapPin } from "lucide-react";
import { API_URL } from "@/lib/config";

interface Reference {
  id: number;
  code: string;
  name: string;
}

export function SearchFilter() {
  const router = useRouter();

  // Данные из API
  const [landUseOptions, setLandUseOptions] = useState<Reference[]>([]);

  // Значения фильтров
  const [settlementIds, setSettlementIds] = useState<number[]>([]);
  const [landUseId, setLandUseId] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Загрузка данных при монтировании
  useEffect(() => {
    fetch(`${API_URL}/api/references?type=land_use`)
      .then((res) => res.json())
      .then(setLandUseOptions)
      .catch(console.error);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (settlementIds.length > 0) params.set("settlements", settlementIds.join(","));
    if (landUseId) params.set("land_use", landUseId);
    if (areaMin) params.set("area_min", (parseFloat(areaMin) * 100).toString()); // сотки → м²
    if (areaMax) params.set("area_max", (parseFloat(areaMax) * 100).toString());
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);

    router.push(`/catalog?${params.toString()}`);
  };

  const handleShowOnMap = () => {
    router.push("/map");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Подобрать участок</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Местоположение */}
        <div className="space-y-2">
          <Label>Район</Label>
          <LocationFilter
            value={settlementIds}
            onChange={setSettlementIds}
            placeholder="Все районы"
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
