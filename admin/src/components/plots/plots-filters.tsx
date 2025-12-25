"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X, Loader2 } from "lucide-react";
import { PlotFilters } from "@/lib/api";

interface PlotsFiltersProps {
    filters: PlotFilters;
    onFiltersChange: (filters: PlotFilters) => void;
}

export function PlotsFilters({ filters, onFiltersChange }: PlotsFiltersProps) {
    const [search, setSearch] = useState(filters.search || "");
    const [isTyping, setIsTyping] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce поиска — автоматический запрос через 500мс после ввода
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (search !== (filters.search || "")) {
            setIsTyping(true);
            debounceRef.current = setTimeout(() => {
                onFiltersChange({ ...filters, search: search || undefined, page: 1 });
                setIsTyping(false);
            }, 500);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search]);

    // Синхронизация при внешнем изменении filters
    useEffect(() => {
        setSearch(filters.search || "");
    }, [filters.search]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Немедленный поиск при нажатии кнопки
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        onFiltersChange({ ...filters, search: search || undefined, page: 1 });
        setIsTyping(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const handleStatusChange = (value: string) => {
        onFiltersChange({
            ...filters,
            status: value === "all" ? undefined : value,
            page: 1,
        });
    };

    const handleGeometryChange = (value: string) => {
        let hasGeometry: boolean | undefined;
        if (value === "with") hasGeometry = true;
        else if (value === "without") hasGeometry = false;
        else hasGeometry = undefined;

        onFiltersChange({ ...filters, has_geometry: hasGeometry, page: 1 });
    };

    const handleClearFilters = () => {
        setSearch("");
        onFiltersChange({ page: 1, size: filters.size });
    };

    const hasActiveFilters = filters.search || filters.status || filters.has_geometry !== undefined;

    return (
        <div className="flex flex-wrap gap-4 items-end">
            {/* Поиск по кадастру */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative">
                    {isTyping ? (
                        <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                        placeholder="Кадастровый номер..."
                        value={search}
                        onChange={handleSearchChange}
                        className="pl-8 w-[250px]"
                    />
                </div>
            </form>

            {/* Статус */}
            <Select
                value={filters.status || "all"}
                onValueChange={handleStatusChange}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">В продаже</SelectItem>
                    <SelectItem value="sold">Продан</SelectItem>
                    <SelectItem value="reserved">Резерв</SelectItem>
                </SelectContent>
            </Select>

            {/* Координаты */}
            <Select
                value={
                    filters.has_geometry === true
                        ? "with"
                        : filters.has_geometry === false
                            ? "without"
                            : "all"
                }
                onValueChange={handleGeometryChange}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Координаты" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="with">С координатами</SelectItem>
                    <SelectItem value="without">Без координат</SelectItem>
                </SelectContent>
            </Select>

            {/* Сброс фильтров */}
            {hasActiveFilters && (
                <Button variant="ghost" onClick={handleClearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Сбросить
                </Button>
            )}
        </div>
    );
}
