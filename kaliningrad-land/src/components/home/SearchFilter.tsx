"use client";

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
import { Search, MapPin } from "lucide-react";

// Данные для фильтров
const locations = [
  { value: "all", label: "Все районы" },
  { value: "kaliningrad", label: "Калининград" },
  { value: "zelenogradsk", label: "Зеленоградск" },
  { value: "svetlogorsk", label: "Светлогорск" },
  { value: "gusev", label: "Гусев" },
  { value: "sovetsk", label: "Советск" },
  { value: "chernyakhovsk", label: "Черняховск" },
  { value: "baltiysk", label: "Балтийск" },
];

const landUseTypes = [
  { value: "all", label: "Любое назначение" },
  { value: "izhs", label: "ИЖС" },
  { value: "lph", label: "ЛПХ" },
  { value: "snt", label: "СНТ / ДНП" },
  { value: "farm", label: "Сельхозназначение" },
  { value: "commercial", label: "Коммерческое" },
];

export function SearchFilter() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Подобрать участок</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Местоположение */}
        <div className="space-y-2">
          <Label htmlFor="location">Местоположение</Label>
          <Select defaultValue="all">
            <SelectTrigger id="location">
              <SelectValue placeholder="Выберите район" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Площадь */}
        <div className="space-y-2">
          <Label>Площадь, соток</Label>
          <div className="flex gap-2">
            <Input type="number" placeholder="от" className="w-full" />
            <Input type="number" placeholder="до" className="w-full" />
          </div>
        </div>

        {/* Назначение */}
        <div className="space-y-2">
          <Label htmlFor="landuse">Разрешённое использование</Label>
          <Select defaultValue="all">
            <SelectTrigger id="landuse">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {landUseTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Цена */}
        <div className="space-y-2">
          <Label>Цена, ₽</Label>
          <div className="flex gap-2">
            <Input type="number" placeholder="от" className="w-full" />
            <Input type="number" placeholder="до" className="w-full" />
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col gap-2 pt-2">
          <Button size="lg" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Найти участки
          </Button>
          <Button size="lg" variant="outline" className="w-full">
            <MapPin className="h-4 w-4 mr-2" />
            Показать на карте
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
