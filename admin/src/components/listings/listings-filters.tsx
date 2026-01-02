"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LocationFilter } from "@/components/filters/LocationFilter";
import { ListingFilters } from "@/lib/api";

interface ListingsFiltersProps {
    filters: ListingFilters;
    onFiltersChange: (filters: ListingFilters) => void;
}

export function ListingsFilters({ filters, onFiltersChange }: ListingsFiltersProps) {
    const updateFilter = (key: keyof ListingFilters, value: any) => {
        onFiltersChange({ ...filters, [key]: value, page: 1 });
    };

    const clearFilters = () => {
        onFiltersChange({ page: 1, size: filters.size || 20 });
    };

    const hasActiveFilters = !!(
        filters.search ||
        filters.cadastral_search ||
        filters.settlement_id ||
        filters.is_published !== undefined ||
        filters.is_featured !== undefined
    );

    return (
        <div className="flex flex-wrap gap-3 items-center">
            {/* Поиск по кадастровому номеру */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Кадастровый №..."
                    value={filters.cadastral_search || ""}
                    onChange={(e) => updateFilter("cadastral_search", e.target.value || undefined)}
                    className="pl-9 w-48"
                />
            </div>

            {/* Населённый пункт - новый компонент с группировкой */}
            <LocationFilter
                value={filters.settlement_id}
                onChange={(id) => updateFilter("settlement_id", id)}
                placeholder="Все населённые пункты"
            />

            {/* Статус публикации */}
            <Select
                value={filters.is_published === undefined ? "all" : String(filters.is_published)}
                onValueChange={(v) => {
                    if (v === "all") {
                        updateFilter("is_published", undefined);
                    } else {
                        updateFilter("is_published", v === "true");
                    }
                }}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="true">Опубликовано</SelectItem>
                    <SelectItem value="false">Черновик</SelectItem>
                </SelectContent>
            </Select>

            {/* Спецпредложение */}
            <Select
                value={filters.is_featured === undefined ? "all" : String(filters.is_featured)}
                onValueChange={(v) => {
                    if (v === "all") {
                        updateFilter("is_featured", undefined);
                    } else {
                        updateFilter("is_featured", v === "true");
                    }
                }}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Спецпредложение" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="true">Спецпредложения</SelectItem>
                    <SelectItem value="false">Обычные</SelectItem>
                </SelectContent>
            </Select>

            {/* Сброс фильтров */}
            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Сбросить
                </Button>
            )}
        </div>
    );
}

