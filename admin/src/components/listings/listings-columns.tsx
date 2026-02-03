"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Star } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListingListItem } from "@/lib/api";

interface GetColumnsOptions {
    onEdit: (listing: ListingListItem) => void;
    onDelete: (listing: ListingListItem) => void;
    currentSort?: string;
    onSort?: (key: string) => void;
}

export function getColumns({
    onEdit,
    onDelete,
    currentSort,
    onSort,
}: GetColumnsOptions): ColumnDef<ListingListItem>[] {
    const SortableHeader = ({ column, label, sortKey }: { column: any; label: string; sortKey: string }) => {
        const isActive = currentSort?.startsWith(sortKey);
        const isDesc = currentSort === `${sortKey}_desc`;

        return (
            <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort?.(sortKey)}
            >
                {label}
                <ArrowUpDown className={`ml-2 h-4 w-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
            </Button>
        );
    };

    return [
        // Checkbox
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Выбрать все"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Выбрать строку"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },

        // ID
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => (
                <span className="text-muted-foreground">#{row.getValue("id")}</span>
            ),
        },

        // Кадастровые номера
        {
            accessorKey: "cadastral_numbers",
            header: "Кадастровые №",
            cell: ({ row }) => {
                const numbers = row.getValue("cadastral_numbers") as string[];
                if (!numbers || numbers.length === 0) {
                    return <span className="text-muted-foreground">—</span>;
                }
                return (
                    <div className="font-mono text-xs w-36 overflow-hidden">
                        {numbers.map((num, idx) => (
                            <div key={idx} className="truncate" title={num}>
                                {num}
                            </div>
                        ))}
                    </div>
                );
            },
        },

        // Название
        {
            accessorKey: "title",
            header: ({ column }) => <SortableHeader column={column} label="Название" sortKey="title" />,
            cell: ({ row }) => (
                <div className="max-w-64">
                    <div className="font-medium truncate">{row.getValue("title")}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                        /{row.original.slug}
                    </div>
                </div>
            ),
        },

        // Населённый пункт (совместимость с новой и старой моделью)
        {
            accessorKey: "location",
            header: "Населённый пункт",
            cell: ({ row }) => {
                const location = row.original.location;
                const settlement = row.original.settlement;

                // Приоритет: новая модель location, потом старая settlement
                if (location) {
                    return (
                        <div className="text-sm">
                            {location.name}
                            {location.parent && (
                                <div className="text-xs text-muted-foreground">
                                    {location.parent.name}
                                </div>
                            )}
                        </div>
                    );
                }

                if (settlement) {
                    return (
                        <div className="text-sm">
                            {settlement.name}
                            {settlement.district && (
                                <div className="text-xs text-muted-foreground">
                                    {settlement.district.name}
                                </div>
                            )}
                        </div>
                    );
                }

                return <span className="text-muted-foreground">—</span>;
            },
        },



        // Участков (берём количество из cadastral_numbers)
        {
            id: "plots_count",
            header: "Участков",
            cell: ({ row }) => {
                const numbers = row.original.cadastral_numbers;
                const count = numbers?.length || row.original.plots_count || 0;
                return (
                    <Badge variant="secondary">
                        {count}
                    </Badge>
                );
            },
        },

        // Площадь
        {
            accessorKey: "total_area",
            header: "Площадь",
            cell: ({ row }) => {
                const areaMin = row.original.area_min;
                const areaMax = row.original.area_max;

                if (!areaMin && !areaMax) {
                    return <span className="text-muted-foreground">—</span>;
                }

                const formatArea = (area: number) => {
                    const sotki = area / 100;
                    return `${sotki.toFixed(2)} сот.`;
                };

                // Если одинаковые или только одно значение — показываем одно число
                if (areaMin === areaMax || !areaMax) {
                    return <span>{formatArea(areaMin!)}</span>;
                }

                // Показываем диапазон
                return (
                    <span>
                        {formatArea(areaMin!)} — {formatArea(areaMax)}
                    </span>
                );
            },
        },

        // Цена
        {
            id: "price",
            header: "Цена",
            cell: ({ row }) => {
                const min = row.original.price_min;
                const max = row.original.price_max;

                if (!min && !max) {
                    return <span className="text-muted-foreground">—</span>;
                }

                const formatPrice = (price: number) => {
                    if (price >= 1000000) {
                        return `${(price / 1000000).toFixed(1)}M`;
                    }
                    if (price >= 1000) {
                        return `${(price / 1000).toFixed(0)}K`;
                    }
                    return String(price);
                };

                if (min === max || !max) {
                    return <span className="font-medium">{formatPrice(min!)}</span>;
                }

                return (
                    <span className="font-medium">
                        {formatPrice(min!)} — {formatPrice(max)}
                    </span>
                );
            },
        },

        // Статус
        {
            id: "status",
            header: "Статус",
            cell: ({ row }) => {
                const isPublished = row.original.is_published;
                const isFeatured = row.original.is_featured;

                return (
                    <div className="flex items-center gap-1">
                        <Badge variant={isPublished ? "default" : "secondary"}>
                            {isPublished ? "Опубликовано" : "Черновик"}
                        </Badge>
                        {isFeatured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                    </div>
                );
            },
        },

        // Создано
        {
            accessorKey: "created_at",
            header: ({ column }) => <SortableHeader column={column} label="Создано" sortKey="newest" />,
            cell: ({ row }) => {
                const date = new Date(row.getValue("created_at"));
                return (
                    <span className="text-sm text-muted-foreground">
                        {format(date, "d MMM yyyy", { locale: ru })}
                    </span>
                );
            },
        },

        // Действия
        {
            id: "actions",
            cell: ({ row }) => {
                const listing = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(listing)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete(listing)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}
