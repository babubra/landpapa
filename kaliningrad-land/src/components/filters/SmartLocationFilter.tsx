"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, X, ChevronRight, Building, Home, Search, Loader2 } from "lucide-react";
import type { LocationType } from "@/lib/geoUrl";

// === Типы ===

/** Результат поиска локации */
interface LocationSearchResult {
    id: number;
    name: string;
    slug: string;
    type: LocationType;
    settlement_type: string | null;
    parent_name: string | null;
    parent_slug: string | null;
    parent_type: LocationType | null;
    listings_count: number;
    sort_order: number;
}

/** Выбранная локация */
export interface SmartSelectedLocation {
    id: number;
    name: string;
    slug: string;
    type: LocationType;
    settlement_type?: string | null;
    parent_slug?: string | null;
    parent_type?: LocationType | null;
}

interface SmartLocationFilterProps {
    /** Выбранная локация (или null) */
    value: SmartSelectedLocation | null;
    /** Callback при выборе локации — передаёт локацию или null */
    onChange: (location: SmartSelectedLocation | null) => void;
    /** Placeholder */
    placeholder?: string;
    /** Включить автоматический redirect на geo-URL */
    enableGeoRedirect?: boolean;
}

// === Иконки типов ===

function TypeIcon({ type }: { type: LocationType }) {
    switch (type) {
        case "city":
            return <Building className="h-4 w-4 text-blue-500" />;
        case "district":
            return <MapPin className="h-4 w-4 text-green-500" />;
        case "settlement":
            return <Home className="h-4 w-4 text-amber-500" />;
        default:
            return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
}

// === Метки типов ===

function getTypeLabel(type: LocationType): string {
    switch (type) {
        case "city":
            return "ГОРОД";
        case "district":
            return "РАЙОН";
        case "settlement":
            return "НАСЕЛЁННЫЙ ПУНКТ";
        default:
            return "ЛОКАЦИЯ";
    }
}

// === Основной компонент ===

export function SmartLocationFilter({
    value,
    onChange,
    placeholder = "Введите район или город",
    enableGeoRedirect = false,
}: SmartLocationFilterProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Состояния
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<LocationSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Данные для модального окна
    const [hierarchyData, setHierarchyData] = useState<LocationSearchResult[]>([]);
    const [hierarchyLoading, setHierarchyLoading] = useState(false);

    // Debounce поиска
    useEffect(() => {
        if (query.trim().length < 1) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query.trim())}&min_listings=1`);
                const data = await res.json();
                setResults(data.results || []);
                setShowDropdown(true);
            } catch (err) {
                console.error("Ошибка поиска:", err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Загрузка данных для модального окна
    const loadHierarchy = useCallback(async () => {
        if (hierarchyData.length > 0) return; // Уже загружено

        setHierarchyLoading(true);
        try {
            // Загружаем иерархию локаций
            const res = await fetch("/api/locations/hierarchy/");
            const data = await res.json();

            // Преобразуем иерархию в плоский список для модального окна
            const flatList: LocationSearchResult[] = [];

            interface HierarchyItem {
                id: number;
                name: string;
                slug: string;
                type: LocationType;
                settlement_type?: string | null;
                listings_count: number;
                sort_order?: number;
                children?: HierarchyItem[];
            }

            const flatten = (items: HierarchyItem[], parentName?: string, parentSlug?: string, parentType?: LocationType) => {
                for (const item of items) {
                    // Пропускаем регион
                    if (item.type !== "region") {
                        flatList.push({
                            id: item.id,
                            name: item.name,
                            slug: item.slug,
                            type: item.type,
                            settlement_type: item.settlement_type || null,
                            parent_name: parentName || null,
                            parent_slug: parentSlug || null,
                            parent_type: parentType || null,
                            listings_count: item.listings_count,
                            sort_order: item.sort_order || 0,
                        });
                    }

                    if (item.children && item.children.length > 0) {
                        flatten(
                            item.children,
                            item.type === "region" ? undefined : item.name,
                            item.type === "region" ? undefined : item.slug,
                            item.type === "region" ? undefined : item.type
                        );
                    }
                }
            };

            flatten(data);
            setHierarchyData(flatList);
        } catch (err) {
            console.error("Ошибка загрузки данных:", err);
        } finally {
            setHierarchyLoading(false);
        }
    }, [hierarchyData.length]);

    // Выбор локации
    const selectLocation = useCallback((loc: LocationSearchResult) => {
        const selected: SmartSelectedLocation = {
            id: loc.id,
            name: loc.name,
            slug: loc.slug,
            type: loc.type,
            settlement_type: loc.settlement_type,
            parent_slug: loc.parent_slug,
            parent_type: loc.parent_type,
        };

        onChange(selected);
        setQuery("");
        setResults([]);
        setShowDropdown(false);
        setShowModal(false);

        // Redirect на geo-URL если включено
        if (enableGeoRedirect) {
            let url = "";
            // Двухсегментный URL только если родитель — район (district)
            if (loc.parent_slug && loc.parent_type === "district") {
                url = `/${loc.parent_slug}/${loc.slug}`;
            } else {
                // Район, город регионального уровня, или локация с родителем-регионом
                url = `/${loc.slug}`;
            }
            router.push(url);
        }
    }, [onChange, enableGeoRedirect, router]);

    // Сброс выбора
    const clearSelection = useCallback(() => {
        onChange(null);
        setQuery("");
        if (enableGeoRedirect) {
            router.push("/catalog");
        }
    }, [onChange, enableGeoRedirect, router]);

    // Закрытие dropdown при клике снаружи
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Группировка результатов по типу
    const groupedResults = results.reduce((acc, item) => {
        const type = item.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {} as Record<string, LocationSearchResult[]>);

    // Порядок типов для отображения
    const typeOrder: LocationType[] = ["city", "district", "settlement"];

    // Получить отображаемое имя
    const getDisplayName = (loc: SmartSelectedLocation | LocationSearchResult): string => {
        if (loc.settlement_type) {
            return `${loc.settlement_type}. ${loc.name}`;
        }
        return loc.name;
    };

    // Открыть модальное окно
    const openModal = () => {
        setShowModal(true);
        loadHierarchy();
    };

    // Объединённый список городов и районов для модального окна
    // Фильтруем локации без объявлений
    // Сортировка: sort_order DESC (больше = выше), затем по алфавиту
    const modalLocationsData = hierarchyData
        .filter(loc => (loc.type === "city" || loc.type === "district") && loc.listings_count > 0)
        .sort((a, b) => {
            // Сначала по sort_order (DESC — больше значение = выше)
            if (a.sort_order !== b.sort_order) {
                return b.sort_order - a.sort_order;
            }
            // Затем по алфавиту
            return a.name.localeCompare(b.name, "ru");
        });

    return (
        <div className="relative w-full">
            {/* Выбранная локация */}
            {value ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <TypeIcon type={value.type} />
                    <span className="flex-1 truncate">{getDisplayName(value)}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={clearSelection}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                /* Input для поиска */
                <div className="relative">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => results.length > 0 && setShowDropdown(true)}
                            className="pl-9 pr-20"
                        />
                        {loading && (
                            <Loader2 className="absolute right-14 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 h-7 text-primary hover:text-primary/80"
                            onClick={openModal}
                        >
                            Район
                        </Button>
                    </div>

                    {/* Dropdown с результатами поиска */}
                    {showDropdown && results.length > 0 && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto min-w-full md:min-w-[500px] max-w-[calc(100vw-32px)]"
                        >
                            {typeOrder.map((type) => {
                                const items = groupedResults[type];
                                if (!items || items.length === 0) return null;

                                return (
                                    <div key={type}>
                                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                            {getTypeLabel(type)}
                                        </div>
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-2"
                                                onClick={() => selectLocation(item)}
                                            >
                                                <TypeIcon type={item.type} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">
                                                        {getDisplayName(item)}
                                                        {item.parent_name && (
                                                            <span className="text-muted-foreground font-normal">
                                                                {" "}({item.parent_name})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.listings_count} объявлений
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Пустой результат */}
                    {showDropdown && query.length >= 1 && !loading && results.length === 0 && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-4 text-center text-muted-foreground"
                        >
                            Ничего не найдено
                        </div>
                    )}
                </div>
            )}

            {/* Модальное окно выбора региона */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="w-[95vw] sm:!max-w-6xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Выберите район или город</DialogTitle>
                    </DialogHeader>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b">
                        <span>Россия</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">Калининградская область</span>
                    </div>

                    {/* Выбранная локация */}
                    {value && (
                        <div className="flex items-center gap-2 py-2">
                            <Badge variant="default" className="pr-1">
                                {getDisplayName(value)}
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        </div>
                    )}

                    {/* Сетка районов и городов (3 колонки) */}
                    <ScrollArea className="h-[450px]">
                        {hierarchyLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : modalLocationsData.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Нет локаций с объявлениями</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {modalLocationsData.map((loc) => {
                                    const isSelected = value?.id === loc.id;
                                    const Icon = loc.type === "city" ? Building : MapPin;
                                    const iconColor = loc.type === "city" ? "text-blue-500" : "text-green-500";

                                    return (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            className={`
                                                flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors
                                                ${isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-accent border border-transparent hover:border-border"
                                                }
                                            `}
                                            onClick={() => selectLocation(loc)}
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary-foreground" : iconColor}`} />
                                                <span className="truncate">{getDisplayName(loc)}</span>
                                            </span>
                                            <span className={`text-xs ml-2 flex-shrink-0 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                {loc.listings_count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
