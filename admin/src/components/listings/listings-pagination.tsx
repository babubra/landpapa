"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ListingsPaginationProps {
    page: number;
    pages: number;
    total: number;
    onPageChange: (page: number) => void;
}

export function ListingsPagination({
    page,
    pages,
    total,
    onPageChange,
}: ListingsPaginationProps) {
    if (pages <= 1) return null;

    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                Всего: <strong>{total}</strong> объявлений
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                </Button>
                <span className="text-sm">
                    Страница <strong>{page}</strong> из <strong>{pages}</strong>
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pages}
                >
                    Вперёд
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
