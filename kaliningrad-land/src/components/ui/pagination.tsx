import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    searchParams: Record<string, string>;
}

export function Pagination({
    currentPage,
    totalPages,
    baseUrl,
    searchParams,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const createPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        return `${baseUrl}?${params.toString()}`;
    };

    // Определяем диапазон страниц для отображения
    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        const delta = 2; // Количество страниц вокруг текущей

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
            }
        }

        return pages;
    };

    return (
        <nav className="flex items-center justify-center gap-1">
            {/* Предыдущая страница */}
            {currentPage > 1 ? (
                <Button variant="outline" size="icon" asChild>
                    <Link href={createPageUrl(currentPage - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
            ) : (
                <Button variant="outline" size="icon" disabled>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            {/* Номера страниц */}
            {getPageNumbers().map((page, index) =>
                page === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                    </span>
                ) : (
                    <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="icon"
                        asChild={page !== currentPage}
                    >
                        {page === currentPage ? (
                            <span>{page}</span>
                        ) : (
                            <Link href={createPageUrl(page)}>{page}</Link>
                        )}
                    </Button>
                )
            )}

            {/* Следующая страница */}
            {currentPage < totalPages ? (
                <Button variant="outline" size="icon" asChild>
                    <Link href={createPageUrl(currentPage + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            ) : (
                <Button variant="outline" size="icon" disabled>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            )}
        </nav>
    );
}
