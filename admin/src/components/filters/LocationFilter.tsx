"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { API_URL } from "@/lib/api";

// Типы данных для новой модели Location

/** Локация в иерархии */
interface LocationHierarchyItem {
    id: number;
    name: string;
    slug: string;
    type: string;  // region, district, city, settlement
    settlement_type: string | null;
    listings_count: number;
    children: LocationHierarchyItem[];
}

interface LocationFilterProps {
    /** Выбранный ID локации (один) */
    value: number | undefined;
    /** Callback при изменении выбора */
    onChange: (id: number | undefined) => void;
    /** Placeholder когда ничего не выбрано */
    placeholder?: string;
}

/**
 * Компонент для выбора местоположения с модальным окном.
 * Использует новую модель Location с иерархией.
 */
export function LocationFilter({
    value,
    onChange,
    placeholder = "Все населённые пункты",
}: LocationFilterProps) {
    const [open, setOpen] = useState(false);
    const [locations, setLocations] = useState<LocationHierarchyItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Раскрытые локации (районы/города)
    const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set());

    // Маппинг ID → имя для отображения выбранных
    const [locationNames, setLocationNames] = useState<Record<number, string>>({});

    // Загрузка данных при открытии модального окна
    useEffect(() => {
        if (open && locations.length === 0) {
            setLoading(true);
            fetch(`${API_URL}/api/locations/hierarchy`)
                .then((res) => res.json())
                .then((data: LocationHierarchyItem[]) => {
                    setLocations(data);
                    // Создаём маппинг имён рекурсивно
                    const names: Record<number, string> = {};
                    const processLocation = (loc: LocationHierarchyItem) => {
                        names[loc.id] = loc.name;
                        loc.children.forEach(processLocation);
                    };
                    data.forEach(processLocation);
                    setLocationNames(names);
                    // Раскрываем все локации верхнего уровня по умолчанию
                    const topLevelIds = new Set<number>();
                    data.forEach((loc) => {
                        topLevelIds.add(loc.id);
                        // Также раскрываем второй уровень (районы)
                        loc.children.forEach((child) => topLevelIds.add(child.id));
                    });
                    setExpandedLocations(topLevelIds);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, locations.length]);

    // Переключение раскрытия локации
    const toggleLocation = useCallback((locationId: number) => {
        setExpandedLocations((prev) => {
            const next = new Set(prev);
            if (next.has(locationId)) {
                next.delete(locationId);
            } else {
                next.add(locationId);
            }
            return next;
        });
    }, []);

    // Выбор локации
    const selectLocation = useCallback((locationId: number) => {
        onChange(locationId);
    }, [onChange]);

    // Сбросить выбор
    const handleReset = () => {
        onChange(undefined);
        setOpen(false);
    };

    // Получить текст для триггера
    const getTriggerText = (): string => {
        if (!value) return placeholder;
        return locationNames[value] || placeholder;
    };

    // Рекурсивный рендер локации
    const renderLocation = (location: LocationHierarchyItem, level: number = 0) => {
        const hasChildren = location.children.length > 0;
        const isExpanded = expandedLocations.has(location.id);
        const isSelected = value === location.id;
        const isSelectable = location.type === "settlement" || location.type === "city";

        return (
            <div key={location.id}>
                <div
                    className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/30 rounded ${isSelected ? "bg-primary/10" : ""
                        }`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => {
                        if (hasChildren) {
                            toggleLocation(location.id);
                        }
                        if (isSelectable) {
                            selectLocation(location.id);
                        }
                    }}
                >
                    {/* Иконка раскрытия */}
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                        )
                    ) : (
                        <div className="w-4" />
                    )}

                    {/* Чекбокс только для населённых пунктов и городов */}
                    {isSelectable && (
                        <Checkbox
                            checked={isSelected}
                            onClick={(e) => {
                                e.stopPropagation();
                                selectLocation(location.id);
                            }}
                        />
                    )}

                    {/* Название */}
                    <span className={`flex-1 ${location.type === "district" || location.type === "region" ? "font-medium" : ""}`}>
                        {location.settlement_type ? `${location.settlement_type} ${location.name}` : location.name}
                    </span>

                    {/* Количество */}
                    <span className="text-xs text-muted-foreground pr-2">
                        ({location.listings_count})
                    </span>
                </div>

                {/* Дети */}
                {hasChildren && isExpanded && (
                    <div>
                        {location.children.map((child) => renderLocation(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="justify-between w-48"
                >
                    <span className="truncate">{getTriggerText()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Выберите населённый пункт</DialogTitle>
                </DialogHeader>

                {/* Выбранный элемент как badge */}
                {value && (
                    <div className="flex flex-wrap gap-1 pb-2">
                        <Badge variant="secondary" className="pr-1">
                            {locationNames[value] || `#${value}`}
                            <button
                                type="button"
                                onClick={() => onChange(undefined)}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    </div>
                )}

                {/* Список локаций */}
                <ScrollArea className="h-[300px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Загрузка...
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Нет данных
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {locations.map((location) => renderLocation(location))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="gap-3">
                    <Button variant="outline" onClick={handleReset}>
                        Сбросить
                    </Button>
                    <Button onClick={() => setOpen(false)}>
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

