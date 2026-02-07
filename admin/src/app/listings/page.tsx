"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RowSelectionState } from "@tanstack/react-table";
import { Plus, Trash2, ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { getListings, bulkDeleteListings, bulkGenerateScreenshots, ListingListItem, ListingFilters } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ListingsTable } from "@/components/listings/listings-table";
import { getColumns } from "@/components/listings/listings-columns";
import { ListingsFilters } from "@/components/listings/listings-filters";
import { ListingsPagination } from "@/components/listings/listings-pagination";
import { ListingFormModal } from "@/components/listings/listing-form-modal";

export default function ListingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Загрузка...</p></div>}>
            <ListingsPageContent />
        </Suspense>
    );
}

function ListingsPageContent() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [listings, setListings] = useState<ListingListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<ListingFilters>({ page: 1, size: 20 });
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Модальное окно
    const [modalOpen, setModalOpen] = useState(false);
    const [editingListingId, setEditingListingId] = useState<number | null>(null);
    const [initialPlotIds, setInitialPlotIds] = useState<number[]>([]);

    // Проверка авторизации
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Загрузка данных
    const loadListings = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await getListings(filters);
            setListings(response.items);
            setTotal(response.total);
            setPages(response.pages);
        } catch (error) {
            toast.error("Ошибка загрузки объявлений");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, filters]);

    useEffect(() => {
        loadListings();
    }, [loadListings]);

    // Обработка query параметра edit для открытия модала редактирования
    useEffect(() => {
        const editId = searchParams.get("edit");
        const plotIdsParam = searchParams.get("plot_ids");

        if (editId) {
            setEditingListingId(parseInt(editId));
            setModalOpen(true);
            router.replace("/listings", { scroll: false });
        } else if (plotIdsParam) {
            // Создание объявления с предвыбранными участками (из карты)
            const ids = plotIdsParam.split(',').map(Number).filter(n => !isNaN(n));
            setInitialPlotIds(ids);
            setEditingListingId(null);
            setModalOpen(true);
            router.replace("/listings", { scroll: false });
        }
    }, [searchParams, router]);

    // Обработчики
    const handleEdit = useCallback((listing: ListingListItem) => {
        setEditingListingId(listing.id);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (listing: ListingListItem) => {
        if (!confirm(`Удалить объявление "${listing.title}"?`)) return;

        try {
            await bulkDeleteListings([listing.id]);
            toast.success("Объявление удалено");
            loadListings();
        } catch (error) {
            toast.error("Ошибка удаления");
        }
    }, [loadListings]);

    const handleBulkDelete = async () => {
        const selectedIds = Object.keys(rowSelection).map(Number);
        if (selectedIds.length === 0) return;

        if (!confirm(`Удалить ${selectedIds.length} объявлений?`)) return;

        try {
            const result = await bulkDeleteListings(selectedIds);
            toast.success(`Удалено: ${result.deleted_count}`);
            setRowSelection({});
            loadListings();
        } catch (error) {
            toast.error("Ошибка массового удаления");
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const handleBulkGenerateScreenshots = async () => {
        const selectedIds = Object.keys(rowSelection).map(Number);
        if (selectedIds.length === 0) return;

        setIsGenerating(true);
        try {
            const result = await bulkGenerateScreenshots(selectedIds, true);
            if (result.success > 0) {
                toast.success(`Сгенерировано: ${result.success} скриншотов`);
            }
            if (result.skipped > 0) {
                toast.info(`Пропущено (есть фото): ${result.skipped}`);
            }
            if (result.failed > 0) {
                toast.warning(`Ошибок: ${result.failed}`);
            }
            loadListings();
        } catch (error) {
            toast.error("Ошибка генерации скриншотов");
        } finally {
            setIsGenerating(false);
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
        setEditingListingId(null);
        setInitialPlotIds([]);
        setModalOpen(true);
    };

    const handleModalSuccess = () => {
        setInitialPlotIds([]);
        loadListings();
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
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Объявления</h1>
                            <p className="text-muted-foreground">
                                Управление объявлениями о продаже
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить объявление
                    </Button>
                </div>

                {/* Filters */}
                <ListingsFilters filters={filters} onFiltersChange={setFilters} />

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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkGenerateScreenshots}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ImageIcon className="mr-2 h-4 w-4" />
                            )}
                            Сгенерировать фото
                        </Button>
                    </div>
                )}

                {/* Table */}
                <ListingsTable
                    columns={columns}
                    data={listings}
                    isLoading={isLoading}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    onRowDoubleClick={handleEdit}
                />

                {/* Pagination */}
                <ListingsPagination
                    page={filters.page || 1}
                    pages={pages}
                    total={total}
                    onPageChange={handlePageChange}
                />
            </div>

            {/* Modal */}
            <ListingFormModal
                open={modalOpen}
                onOpenChange={(open) => {
                    setModalOpen(open);
                    if (!open) setInitialPlotIds([]);
                }}
                listingId={editingListingId}
                initialPlotIds={initialPlotIds}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}
