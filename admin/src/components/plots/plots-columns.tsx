"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, MapPin, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PlotListItem } from "@/lib/api";

/**
 * Форматирование площади в сотки.
 */
function formatArea(areaM2: number | null): string {
    if (!areaM2) return "—";
    const sotki = areaM2 / 100;
    return `${sotki.toLocaleString("ru-RU")} сот.`;
}

/**
 * Форматирование цены.
 */
function formatPrice(price: number | null): string {
    if (!price) return "—";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

/**
 * Бейдж статуса.
 */
function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        active: "default",
        sold: "secondary",
        reserved: "outline",
    };

    const labels: Record<string, string> = {
        active: "В продаже",
        sold: "Продан",
        reserved: "Резерв",
    };

    return (
        <Badge variant={variants[status] || "default"}>
            {labels[status] || status}
        </Badge>
    );
}

/**
 * Кликабельный заголовок для сортировки.
 */
interface SortableHeaderProps {
    label: string;
    sortKey: string;
    currentSort?: string;
    onSort: (key: string) => void;
}

function SortableHeader({ label, sortKey, currentSort, onSort }: SortableHeaderProps) {
    const isActive = currentSort?.replace("_desc", "").replace("_asc", "") === sortKey;
    const isDesc = currentSort === `${sortKey}_desc`;
    const isAsc = currentSort === `${sortKey}_asc`;

    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 font-medium"
            onClick={() => onSort(sortKey)}
        >
            {label}
            {isActive ? (
                isDesc ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
        </Button>
    );
}

interface ColumnsProps {
    onEdit: (plot: PlotListItem) => void;
    onDelete: (plot: PlotListItem) => void;
    currentSort?: string;
    onSort?: (key: string) => void;
}

export function getColumns({ onEdit, onDelete, currentSort, onSort }: ColumnsProps): ColumnDef<PlotListItem>[] {
    const handleSort = onSort || (() => { });

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
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
        {
            accessorKey: "cadastral_number",
            header: () => (
                <SortableHeader
                    label="Кадастр"
                    sortKey="cadastral"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-sm">
                    {row.original.cadastral_number || "—"}
                </span>
            ),
        },
        {
            accessorKey: "area",
            header: () => (
                <SortableHeader
                    label="Площадь"
                    sortKey="area"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => formatArea(row.original.area),
        },
        {
            accessorKey: "price_public",
            header: () => (
                <SortableHeader
                    label="Цена"
                    sortKey="price"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => formatPrice(row.original.price_public),
        },
        {
            accessorKey: "address",
            header: () => (
                <SortableHeader
                    label="Адрес"
                    sortKey="address"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => (
                <div className="max-w-[250px] whitespace-normal text-sm leading-tight">
                    {row.original.address || "—"}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: () => (
                <SortableHeader
                    label="Статус"
                    sortKey="status"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            accessorKey: "has_geometry",
            header: () => (
                <SortableHeader
                    label="Координаты"
                    sortKey="geometry"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => (
                row.original.has_geometry ? (
                    <MapPin className="h-4 w-4 text-green-600" />
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            ),
        },
        {
            accessorKey: "land_use",
            header: "Назначение",
            cell: ({ row }) => row.original.land_use?.name || "—",
        },
        {
            accessorKey: "listing",
            header: "Объявление",
            cell: ({ row }) => (
                row.original.listing ? (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                        {row.original.listing.title}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            ),
        },
        {
            accessorKey: "comment",
            header: () => (
                <SortableHeader
                    label="Комментарий"
                    sortKey="comment"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            cell: ({ row }) => (
                <div className="max-w-[250px] whitespace-normal text-sm text-muted-foreground leading-tight">
                    {row.original.comment || "—"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const plot = row.original;

                return (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(plot)}
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Редактировать</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDelete(plot)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Удалить</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
}
