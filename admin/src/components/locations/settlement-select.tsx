"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DaDataSuggestion,
    SettlementItem,
    suggestSettlements,
    resolveSettlement,
    ResolveData,
    SettlementResolved
} from "@/lib/api";
import { toast } from "sonner";

interface SettlementSelectProps {
    value?: SettlementItem | null;
    onSelect: (settlement: SettlementResolved | null) => void;
    placeholder?: string;
    className?: string;
}

export function SettlementSelect({
    value,
    onSelect,
    placeholder = "Начните вводить название...",
    className,
}: SettlementSelectProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Инициализация значения
    useEffect(() => {
        if (value) {
            const fullName = value.district
                ? `${value.name}, ${value.district.name}`
                : value.name;
            setQuery(fullName);
        }
    }, [value]);

    // Обработка клика вне компонента
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Поиск с дебаунсом
    useEffect(() => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        // Если введенное значение совпадает с текущим выбранным, не ищем
        if (value && query.includes(value.name)) {
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const results = await suggestSettlements(query);
                setSuggestions(results);
                setShowResults(true);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, value]);

    const handleSelect = async (suggestion: DaDataSuggestion) => {
        // Формируем данные для резолва
        // DaData возвращает: city (Город), settlement (Населенный пункт), area (Район)
        // Если settlement есть, то это поселок. Если нет, то это город (city).

        const data = suggestion.data;
        const name = data.settlement || data.city;
        const type = data.settlement_type || data.city_type;
        const districtName = data.area_with_type || data.city_district_with_type;
        const districtFias = data.area_fias_id || data.city_district_fias_id;
        const settlementFias = data.settlement_fias_id || data.city_fias_id;
        const regionName = data.region_with_type;

        if (!name) {
            toast.error("Некорректный выбор: отсутсвует название населенного пункта");
            return;
        }

        setIsResolving(true);
        try {
            const resolveData: ResolveData = {
                name,
                type,
                district_name: districtName,
                district_fias_id: districtFias,
                settlement_fias_id: settlementFias,
                region_name: regionName,
            };

            const result = await resolveSettlement(resolveData);
            setQuery(result.full_name);
            onSelect(result);
            setShowResults(false);
        } catch (error) {
            toast.error("Ошибка сохранения населенного пункта");
        } finally {
            setIsResolving(false);
        }
    };

    const handleClear = () => {
        setQuery("");
        setSuggestions([]);
        onSelect(null);
    };

    return (
        <div ref={wrapperRef} className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!showResults) setShowResults(true);
                    }}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowResults(true);
                    }}
                    placeholder={placeholder}
                    className="pl-9 pr-8"
                    disabled={isResolving}
                />
                {(isResolving || isLoading) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {showResults && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index} // DaData suggestions don't always have unique reliable ID for key in list render
                            className="flex flex-col p-2 hover:bg-muted cursor-pointer text-sm gap-0.5 border-b last:border-b-0"
                            onClick={() => handleSelect(suggestion)}
                        >
                            <span className="font-medium">
                                {suggestion.value}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>
                                    {suggestion.data.area_with_type || suggestion.data.region_with_type}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="p-2 text-xs text-muted-foreground text-center bg-muted/20">
                        Выберите вариант из списка
                    </div>
                </div>
            )}
        </div>
    );
}
