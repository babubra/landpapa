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

// Типы данных

/** Населённый пункт в группе */
interface SettlementItem {
    id: number;
    name: string;
    plots_count: number;
}

/** Район с вложенными населёнными пунктами */
interface DistrictGroup {
    id: number;
    name: string;
    plots_count: number;
    settlements: SettlementItem[];
}

interface LocationFilterProps {
    /** Выбранный ID населённого пункта (один) */
    value: number | undefined;
    /** Callback при изменении выбора */
    onChange: (id: number | undefined) => void;
    /** Placeholder когда ничего не выбрано */
    placeholder?: string;
}

/**
 * Компонент для выбора местоположения с модальным окном.
 * Адаптирован для админки - выбор только одного населённого пункта.
 */
export function LocationFilter({
    value,
    onChange,
    placeholder = "Все населённые пункты",
}: LocationFilterProps) {
    const [open, setOpen] = useState(false);
    const [districts, setDistricts] = useState<DistrictGroup[]>([]);
    const [loading, setLoading] = useState(false);

    // Раскрытые районы
    const [expandedDistricts, setExpandedDistricts] = useState<Set<number>>(new Set());

    // Маппинг ID → имя для отображения выбранных
    const [settlementNames, setSettlementNames] = useState<Record<number, string>>({});

    // Загрузка данных при открытии модального окна
    useEffect(() => {
        if (open && districts.length === 0) {
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
    }, [open, districts.length]);

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

    // Выбор населённого пункта
    const selectSettlement = useCallback((settlementId: number) => {
        onChange(settlementId);
        // Не закрываем окно, позволяем пользователю подтвердить выбор
    }, [onChange]);

    // Сбросить выбор
    const handleReset = () => {
        onChange(undefined);
        setOpen(false);
    };

    // Получить текст для триггера
    const getTriggerText = (): string => {
        if (!value) return placeholder;
        return settlementNames[value] || placeholder;
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
                            {settlementNames[value] || `#${value}`}
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
                                            <span className="font-medium flex-1">{district.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({district.plots_count})
                                            </span>
                                        </div>

                                        {/* Населённые пункты */}
                                        {isExpanded && (
                                            <div className="border-t px-2 py-1 space-y-1">
                                                {district.settlements.map((settlement) => (
                                                    <div
                                                        key={settlement.id}
                                                        className={`flex items-center gap-2 pl-6 py-1 cursor-pointer hover:bg-muted/30 rounded ${value === settlement.id ? "bg-primary/10" : ""
                                                            }`}
                                                        onClick={() => selectSettlement(settlement.id)}
                                                    >
                                                        <Checkbox
                                                            checked={value === settlement.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                selectSettlement(settlement.id);
                                                            }}
                                                        />
                                                        <span className="flex-1">{settlement.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({settlement.plots_count})
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
                    <Button onClick={() => setOpen(false)}>
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
