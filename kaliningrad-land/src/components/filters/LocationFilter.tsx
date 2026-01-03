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
import { MapPin, ChevronDown, ChevronRight, X } from "lucide-react";
import { API_URL } from "@/lib/config";

// Типы данных

/** Населённый пункт в группе */
interface SettlementItem {
    id: number;
    name: string;
    listings_count: number;
}

/** Район с вложенными населёнными пунктами */
interface DistrictGroup {
    id: number;
    name: string;
    listings_count: number;
    settlements: SettlementItem[];
}

interface LocationFilterProps {
    /** Выбранные ID населённых пунктов */
    value: number[];
    /** Callback при изменении выбора */
    onChange: (ids: number[]) => void;
    /** Callback для применения фильтров сразу (передаёт новые значения) */
    onApply?: (ids: number[]) => void;
    /** Placeholder когда ничего не выбрано */
    placeholder?: string;
    /** Кнопка-триггер растягивается на всю ширину */
    fullWidth?: boolean;
}

/**
 * Компонент для выбора местоположения с модальным окном.
 * Позволяет выбирать несколько населённых пунктов, сгруппированных по районам.
 */
export function LocationFilter({
    value,
    onChange,
    onApply,
    placeholder = "Все районы",
    fullWidth = true,
}: LocationFilterProps) {
    const [open, setOpen] = useState(false);
    const [districts, setDistricts] = useState<DistrictGroup[]>([]);
    const [loading, setLoading] = useState(false);

    // Локальное состояние для выбора в модальном окне
    const [localSelection, setLocalSelection] = useState<number[]>(value);

    // Раскрытые районы
    const [expandedDistricts, setExpandedDistricts] = useState<Set<number>>(new Set());

    // Маппинг ID → имя для отображения выбранных
    const [settlementNames, setSettlementNames] = useState<Record<number, string>>({});

    // Загрузка данных при открытии модального окна ИЛИ если есть выбранные значения
    useEffect(() => {
        const shouldLoad = (open || value.length > 0) && districts.length === 0;
        if (shouldLoad) {
            setLoading(true);
            fetch(`${API_URL}/api/locations/settlements-grouped`)
                .then((res) => res.json())
                .then((data: DistrictGroup[]) => {
                    setDistricts(data);
                    // Создаём маппинг имён
                    const names: Record<number, string> = {};
                    data.forEach((d) => {
                        d.settlements.forEach((s) => {
                            names[s.id] = s.name;
                        });
                    });
                    setSettlementNames(names);
                    // Раскрываем все районы по умолчанию
                    setExpandedDistricts(new Set(data.map((d) => d.id)));
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, districts.length, value.length]);

    // Синхронизация локального выбора с внешним value
    useEffect(() => {
        setLocalSelection(value);
    }, [value]);

    // Переключение раскрытия района
    const toggleDistrict = useCallback((districtId: number) => {
        setExpandedDistricts((prev) => {
            const next = new Set(prev);
            if (next.has(districtId)) {
                next.delete(districtId);
            } else {
                next.add(districtId);
            }
            return next;
        });
    }, []);

    // Переключение выбора населённого пункта
    const toggleSettlement = useCallback((settlementId: number) => {
        setLocalSelection((prev) => {
            if (prev.includes(settlementId)) {
                return prev.filter((id) => id !== settlementId);
            } else {
                return [...prev, settlementId];
            }
        });
    }, []);

    // Выбрать/снять все населённые пункты в районе
    const toggleAllInDistrict = useCallback((district: DistrictGroup) => {
        const districtSettlementIds = district.settlements.map((s) => s.id);
        const allSelected = districtSettlementIds.every((id) =>
            localSelection.includes(id)
        );

        if (allSelected) {
            // Снять все
            setLocalSelection((prev) =>
                prev.filter((id) => !districtSettlementIds.includes(id))
            );
        } else {
            // Выбрать все
            setLocalSelection((prev) => {
                const newIds = districtSettlementIds.filter((id) => !prev.includes(id));
                return [...prev, ...newIds];
            });
        }
    }, [localSelection]);

    // Применить выбор
    const handleApply = () => {
        onChange(localSelection);
        setOpen(false);
        // Автоматически применяем фильтры если передан onApply (передаём новые значения)
        if (onApply) {
            onApply(localSelection);
        }
    };

    // Сбросить выбор
    const handleReset = () => {
        setLocalSelection([]);
    };

    // Удалить один элемент из выбора (для badge)
    const removeSettlement = (id: number) => {
        const newValue = value.filter((v) => v !== id);
        onChange(newValue);
    };

    // Получить текст для триггера
    const getTriggerText = (): string => {
        if (value.length === 0) return placeholder;
        if (value.length === 1) return settlementNames[value[0]] || placeholder;
        return `${settlementNames[value[0]]} +${value.length - 1}`;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={`justify-between ${fullWidth ? "w-full" : ""}`}
                >
                    <span className="flex items-center gap-2 truncate">
                        <MapPin className="h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">{getTriggerText()}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Выберите местоположение</DialogTitle>
                </DialogHeader>

                {/* Выбранные элементы как badges */}
                {localSelection.length > 0 && (
                    <div className="flex flex-wrap gap-1 pb-2">
                        {localSelection.map((id) => (
                            <Badge key={id} variant="secondary" className="pr-1">
                                {settlementNames[id] || `#${id}`}
                                <button
                                    type="button"
                                    onClick={() => toggleSettlement(id)}
                                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Список районов и населённых пунктов */}
                <ScrollArea className="h-[300px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Загрузка...
                        </div>
                    ) : districts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Нет данных
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {districts.map((district) => {
                                const isExpanded = expandedDistricts.has(district.id);
                                const districtSettlementIds = district.settlements.map((s) => s.id);
                                const allSelected = districtSettlementIds.every((id) =>
                                    localSelection.includes(id)
                                );
                                const someSelected =
                                    !allSelected &&
                                    districtSettlementIds.some((id) => localSelection.includes(id));

                                return (
                                    <div key={district.id} className="border rounded-lg">
                                        {/* Заголовок района */}
                                        <div
                                            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleDistrict(district.id)}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 shrink-0" />
                                            )}
                                            <Checkbox
                                                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllInDistrict(district);
                                                }}
                                            />
                                            <span className="font-medium flex-1">{district.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({district.listings_count})
                                            </span>
                                        </div>

                                        {/* Населённые пункты */}
                                        {isExpanded && (
                                            <div className="border-t px-2 py-1 space-y-1">
                                                {district.settlements.map((settlement) => (
                                                    <div
                                                        key={settlement.id}
                                                        className="flex items-center gap-2 pl-6 py-1 cursor-pointer hover:bg-muted/30 rounded"
                                                        onClick={() => toggleSettlement(settlement.id)}
                                                    >
                                                        <Checkbox
                                                            checked={localSelection.includes(settlement.id)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSettlement(settlement.id);
                                                            }}
                                                        />
                                                        <span className="flex-1">{settlement.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({settlement.listings_count})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="gap-3">
                    <Button variant="outline" onClick={handleReset}>
                        Сбросить
                    </Button>
                    <Button onClick={handleApply}>
                        Применить {localSelection.length > 0 && `(${localSelection.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
