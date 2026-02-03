"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    DaDataSuggestion,
    suggestSettlements,
    resolveLocation,
    ResolveLocationData,
    LocationResolved
} from "@/lib/api";
import { toast } from "sonner";

interface LocationSelectProps {
    value?: LocationResolved | null;
    onSelect: (location: LocationResolved | null) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Компонент выбора локации с автокомплитом через DaData.
 * Использует новый API resolve-v2 для работы с иерархией Location.
 */
export function LocationSelect({
    value,
    onSelect,
    placeholder = "Начните вводить название...",
    className,
}: LocationSelectProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Инициализация значения
    useEffect(() => {
        if (value) {
            setQuery(value.full_name);
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
        if (value && query === value.full_name) {
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
        /**
         * DaData возвращает разные структуры:
         * - settlement (населённый пункт) + area (район) — для сёл/посёлков
         * - city (город) без area — для городских округов
         */
        const data = suggestion.data;

        // Определяем название и тип
        const name = data.settlement || data.city;
        const settlementType = data.settlement_type || data.city_type;

        if (!name) {
            toast.error("Некорректный выбор: отсутствует название населенного пункта");
            return;
        }

        // Собираем данные для resolve-v2
        let resolveData: ResolveLocationData;

        // Если есть settlement — это н.п. внутри района
        if (data.settlement) {
            resolveData = {
                name: data.settlement,
                settlement_type: data.settlement_type_full || data.settlement_type,
                settlement_fias_id: data.settlement_fias_id,
                district_name: data.area_with_type || data.area,
                district_fias_id: data.area_fias_id,
            };
        } else {
            // Это городской округ (Калининград, Пионерский и т.д.)
            resolveData = {
                name: data.city,
                settlement_type: data.city_type_full || data.city_type,
                city_name: data.city,
                city_fias_id: data.city_fias_id,
            };
        }

        setIsResolving(true);
        try {
            const result = await resolveLocation(resolveData);
            setQuery(result.full_name);
            onSelect(result);
            setShowResults(false);
        } catch (error) {
            toast.error("Ошибка сохранения локации");
            console.error(error);
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
                            key={index}
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
