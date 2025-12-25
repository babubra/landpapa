"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RowSelectionState } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { getPlots, bulkDeletePlots, PlotListItem, PlotFilters } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PlotsTable } from "@/components/plots/plots-table";
import { getColumns } from "@/components/plots/plots-columns";
import { PlotsFilters } from "@/components/plots/plots-filters";
import { PlotsPagination } from "@/components/plots/plots-pagination";
import { PlotFormModal } from "@/components/plots/plot-form-modal";

export default function PlotsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [plots, setPlots] = useState<PlotListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<PlotFilters>({ page: 1, size: 20 });
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Модальное окно
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlot, setEditingPlot] = useState<PlotListItem | null>(null);

    // Проверка авторизации
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Загрузка данных
    const loadPlots = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await getPlots(filters);
            setPlots(response.items);
            setTotal(response.total);
            setPages(response.pages);
        } catch (error) {
            toast.error("Ошибка загрузки участков");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, filters]);

    useEffect(() => {
        loadPlots();
    }, [loadPlots]);

    // Обработчики
    const handleEdit = useCallback((plot: PlotListItem) => {
        setEditingPlot(plot);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (plot: PlotListItem) => {
        if (!confirm(`Удалить участок ${plot.cadastral_number || plot.id}?`)) return;

        try {
            await bulkDeletePlots([plot.id]);
            toast.success("Участок удалён");
            loadPlots();
        } catch (error) {
            toast.error("Ошибка удаления");
        }
    }, [loadPlots]);

    const handleBulkDelete = async () => {
        const selectedIds = Object.keys(rowSelection).map(Number);
        if (selectedIds.length === 0) return;

        if (!confirm(`Удалить ${selectedIds.length} участков?`)) return;

        try {
            const result = await bulkDeletePlots(selectedIds);
            toast.success(`Удалено: ${result.deleted_count}`);
            setRowSelection({});
            loadPlots();
        } catch (error) {
            toast.error("Ошибка массового удаления");
        }
    };

    const handlePageChange = (page: number) => {
        setFilters({ ...filters, page });
    };

    const handleSort = useCallback((key: string) => {
        const currentSort = filters.sort || "";
        const isCurrentKey = currentSort.startsWith(key);
        const isDesc = currentSort === `${key}_desc`;

        // Cycle: none -> asc -> desc -> none
        let newSort: string | undefined;
        if (!isCurrentKey) {
            newSort = `${key}_asc`;
        } else if (!isDesc) {
            newSort = `${key}_desc`;
        } else {
            newSort = undefined;
        }

        setFilters({ ...filters, sort: newSort, page: 1 });
    }, [filters]);

    const handleCreate = () => {
        setEditingPlot(null);
        setModalOpen(true);
    };

    const handleModalSuccess = () => {
        loadPlots();
    };

    // Колонки с обработчиками
    const columns = useMemo(
        () => getColumns({
            onEdit: handleEdit,
            onDelete: handleDelete,
            currentSort: filters.sort,
            onSort: handleSort,
        }),
        [handleEdit, handleDelete, filters.sort, handleSort]
    );

    const selectedCount = Object.keys(rowSelection).length;

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Участки</h1>
                        <p className="text-muted-foreground">
                            Управление земельными участками
                        </p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить участок
                    </Button>
                </div>

                {/* Filters */}
                <PlotsFilters filters={filters} onFiltersChange={setFilters} />

                {/* Bulk actions */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <span className="text-sm">
                            Выбрано: <strong>{selectedCount}</strong>
                        </span>
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить выбранные
                        </Button>
                    </div>
                )}

                {/* Table */}
                <PlotsTable
                    columns={columns}
                    data={plots}
                    isLoading={isLoading}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                />

                {/* Pagination */}
                <PlotsPagination
                    page={filters.page || 1}
                    pages={pages}
                    total={total}
                    onPageChange={handlePageChange}
                />
            </div>

            {/* Modal */}
            <PlotFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                plot={editingPlot}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}

