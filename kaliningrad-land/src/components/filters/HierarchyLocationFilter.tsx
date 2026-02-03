"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { MapPin, ChevronDown, ChevronRight, X, Building, Home } from "lucide-react";
import type { HierarchyLocation, SelectedLocation, LocationType } from "@/lib/geoUrl";

// === Типы ===

interface HierarchyLocationFilterProps {
    /** Выбранные локации */
    value: SelectedLocation[];
    /** Callback при изменении выбора */
    onChange: (locations: SelectedLocation[]) => void;
    /** Callback для применения фильтров */
    onApply?: (locations: SelectedLocation[]) => void;
    /** Placeholder когда ничего не выбрано */
    placeholder?: string;
    /** Кнопка-триггер растягивается на всю ширину */
    fullWidth?: boolean;
}

// === Иконки для типов локаций ===

function LocationIcon({ type }: { type: LocationType }) {
    switch (type) {
        case "city":
            return <Building className="h-4 w-4 text-blue-500" />;
        case "district":
            return <MapPin className="h-4 w-4 text-green-500" />;
        case "settlement":
            return <Home className="h-4 w-4 text-amber-500" />;
        default:
            return <MapPin className="h-4 w-4" />;
    }
}

// === Рекурсивный компонент для отображения дерева ===

interface LocationNodeProps {
    node: HierarchyLocation;
    level: number;
    selectedIds: Set<number>;
    expandedIds: Set<number>;
    onToggleSelect: (node: HierarchyLocation) => void;
    onToggleExpand: (id: number) => void;
}

function LocationNode({
    node,
    level,
    selectedIds,
    expandedIds,
    onToggleSelect,
    onToggleExpand,
}: LocationNodeProps) {
    const isSelected = selectedIds.has(node.id);
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    // Проверяем, есть ли выбранные потомки
    const hasSelectedDescendants = useMemo(() => {
        const checkDescendants = (children: HierarchyLocation[]): boolean => {
            for (const child of children) {
                if (selectedIds.has(child.id)) return true;
                if (checkDescendants(child.children)) return true;
            }
            return false;
        };
        return checkDescendants(node.children);
    }, [node.children, selectedIds]);

    // Не показываем регион
    if (node.type === "region") {
        return (
            <>
                {node.children.map((child) => (
                    <LocationNode
                        key={child.id}
                        node={child}
                        level={0}
                        selectedIds={selectedIds}
                        expandedIds={expandedIds}
                        onToggleSelect={onToggleSelect}
                        onToggleExpand={onToggleExpand}
                    />
                ))}
            </>
        );
    }

    return (
        <div className={level > 0 ? "ml-4 border-l pl-2" : ""}>
            <div
                className={`
                    flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer
                    hover:bg-muted/50
                    ${isSelected ? "bg-primary/10" : ""}
                `}
            >
                {/* Expand/Collapse */}
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(node.id);
                        }}
                        className="p-0.5 hover:bg-muted rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                ) : (
                    <span className="w-5" />
                )}

                {/* Checkbox */}
                <Checkbox
                    checked={isSelected}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(node);
                    }}
                />

                {/* Icon */}
                <LocationIcon type={node.type} />

                {/* Name */}
                <span
                    className={`flex-1 ${isSelected ? "font-medium" : ""}`}
                    onClick={() => onToggleSelect(node)}
                >
                    {node.settlement_type ? `${node.settlement_type}. ` : ""}
                    {node.name}
                </span>

                {/* Count */}
                <span className="text-xs text-muted-foreground">
                    ({node.listings_count})
                </span>

                {/* Indicator for selected descendants */}
                {hasSelectedDescendants && !isSelected && (
                    <span className="w-2 h-2 rounded-full bg-primary/50" />
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {node.children.map((child) => (
                        <LocationNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onToggleSelect={onToggleSelect}
                            onToggleExpand={onToggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// === Основной компонент ===

export function HierarchyLocationFilter({
    value,
    onChange,
    onApply,
    placeholder = "Все районы",
    fullWidth = true,
}: HierarchyLocationFilterProps) {
    const [open, setOpen] = useState(false);
    const [hierarchy, setHierarchy] = useState<HierarchyLocation[]>([]);
    const [loading, setLoading] = useState(false);

    // Локальное состояние для выбора
    const [localSelection, setLocalSelection] = useState<SelectedLocation[]>(value);

    // Раскрытые узлы
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // Выбранные ID для быстрого поиска
    const selectedIds = useMemo(
        () => new Set(localSelection.map((l) => l.id)),
        [localSelection]
    );

    // Загрузка данных
    useEffect(() => {
        const shouldLoad = (open || value.length > 0) && hierarchy.length === 0;
        if (shouldLoad) {
            setLoading(true);
            fetch("/api/locations/hierarchy/")
                .then((res) => res.json())
                .then((data: HierarchyLocation[]) => {
                    setHierarchy(data);
                    // Раскрываем первый уровень по умолчанию
                    const firstLevelIds = new Set<number>();
                    data.forEach((region) => {
                        region.children.forEach((loc) => {
                            firstLevelIds.add(loc.id);
                        });
                    });
                    setExpandedIds(firstLevelIds);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, hierarchy.length, value.length]);

    // Синхронизация с внешним value
    useEffect(() => {
        setLocalSelection(value);
    }, [value]);

    // Переключение раскрытия узла
    const toggleExpand = useCallback((id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Переключение выбора локации
    const toggleSelect = useCallback((node: HierarchyLocation) => {
        setLocalSelection((prev) => {
            const existing = prev.find((l) => l.id === node.id);
            if (existing) {
                // Удаляем
                return prev.filter((l) => l.id !== node.id);
            } else {
                // Добавляем
                // Находим parent из дерева
                let parentId: number | undefined;
                const findParent = (tree: HierarchyLocation[], targetId: number): number | undefined => {
                    for (const n of tree) {
                        for (const child of n.children) {
                            if (child.id === targetId) return n.id;
                            const found = findParent([child], targetId);
                            if (found) return found;
                        }
                    }
                    return undefined;
                };
                parentId = findParent(hierarchy, node.id);

                return [
                    ...prev,
                    {
                        id: node.id,
                        name: node.name,
                        slug: node.slug,
                        type: node.type,
                        parentId,
                    },
                ];
            }
        });
    }, [hierarchy]);

    // Применить выбор
    const handleApply = () => {
        onChange(localSelection);
        setOpen(false);
        if (onApply) {
            onApply(localSelection);
        }
    };

    // Сбросить выбор
    const handleReset = () => {
        setLocalSelection([]);
    };

    // Удалить один элемент
    const removeLocation = (id: number) => {
        setLocalSelection((prev) => prev.filter((l) => l.id !== id));
    };

    // Текст для триггера
    const getTriggerText = (): string => {
        if (value.length === 0) return placeholder;
        if (value.length === 1) return value[0].name;
        return `${value[0].name} +${value.length - 1}`;
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

            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Выберите местоположение</DialogTitle>
                </DialogHeader>

                {/* Выбранные элементы */}
                {localSelection.length > 0 && (
                    <div className="flex flex-wrap gap-1 pb-2">
                        {localSelection.map((loc) => (
                            <Badge key={loc.id} variant="secondary" className="pr-1">
                                {loc.name}
                                <button
                                    type="button"
                                    onClick={() => removeLocation(loc.id)}
                                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Дерево локаций */}
                <ScrollArea className="h-[350px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Загрузка...
                        </div>
                    ) : hierarchy.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Нет данных
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {hierarchy.map((node) => (
                                <LocationNode
                                    key={node.id}
                                    node={node}
                                    level={0}
                                    selectedIds={selectedIds}
                                    expandedIds={expandedIds}
                                    onToggleSelect={toggleSelect}
                                    onToggleExpand={toggleExpand}
                                />
                            ))}
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

export type { HierarchyLocation, SelectedLocation };
