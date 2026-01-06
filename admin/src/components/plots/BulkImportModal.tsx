"use client";

import { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileJson, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { bulkImportPlots, BulkImportItem, BulkImportResponse, BulkImportResultItem } from "@/lib/api";
import { toast } from "sonner";

interface BulkImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function BulkImportModal({
    open,
    onOpenChange,
    onSuccess,
}: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [items, setItems] = useState<BulkImportItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BulkImportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setFile(null);
        setItems([]);
        setResult(null);
        setError(null);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setError(null);
        setResult(null);

        try {
            const text = await selectedFile.text();
            const parsed = JSON.parse(text);

            if (!Array.isArray(parsed)) {
                throw new Error("Файл должен содержать массив участков");
            }

            // Валидация структуры
            for (const item of parsed) {
                if (!item.cadastral_number) {
                    throw new Error("Каждый элемент должен содержать cadastral_number");
                }
            }

            setFile(selectedFile);
            setItems(parsed);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка парсинга файла");
            setFile(null);
            setItems([]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/json") {
            const fakeEvent = {
                target: { files: [droppedFile] },
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileChange(fakeEvent);
        }
    }, []);

    const handleImport = async () => {
        if (items.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await bulkImportPlots(items);
            setResult(response);

            if (response.errors === 0) {
                toast.success(`Импортировано: ${response.created} создано, ${response.updated} обновлено`);
            } else {
                toast.warning(`Импорт завершён с ошибками: ${response.errors} из ${response.total}`);
            }

            onSuccess();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка импорта");
            toast.error("Ошибка при импорте участков");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            resetState();
            onOpenChange(false);
        }
    };

    const getStatusIcon = (item: BulkImportResultItem) => {
        if (item.status === "created") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (item.status === "updated") return <AlertCircle className="h-4 w-4 text-blue-500" />;
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    const getNspdStatusBadge = (status: string | null | undefined) => {
        if (!status) return null;
        if (status === "success") return <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">NSPD ✓</span>;
        if (status === "not_found") return <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">NSPD: не найден</span>;
        return <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">NSPD ✗</span>;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] z-[9999]">
                <DialogHeader>
                    <DialogTitle>Массовая загрузка участков</DialogTitle>
                    <DialogDescription>
                        Загрузите JSON файл с участками. Формат: массив объектов с полями cadastral_number, price, comment.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <>
                        {/* Зона загрузки */}
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => document.getElementById("file-input")?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileJson className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {items.length} участков
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        Перетащите JSON файл или кликните для выбора
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Предпросмотр */}
                        {items.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Предпросмотр ({items.length} записей):</p>
                                <ScrollArea className="h-[200px] border rounded-lg p-3">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left pb-2">Кадастровый номер</th>
                                                <th className="text-right pb-2">Цена</th>
                                                <th className="text-left pb-2">Комментарий</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.slice(0, 10).map((item, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-1.5 font-mono text-xs">
                                                        {item.cadastral_number}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                        {item.price?.toLocaleString("ru-RU")} ₽
                                                    </td>
                                                    <td className="py-1.5 text-muted-foreground truncate max-w-[150px]">
                                                        {item.comment || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length > 10 && (
                                                <tr>
                                                    <td colSpan={3} className="py-1.5 text-center text-muted-foreground">
                                                        ... и ещё {items.length - 10} записей
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        {isLoading && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Импорт участков и получение данных из NSPD...
                                </p>
                                <Progress value={undefined} className="h-2" />
                            </div>
                        )}
                    </>
                ) : (
                    /* Результаты */
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{result.total}</p>
                                <p className="text-xs text-muted-foreground">Всего</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                                <p className="text-xs text-muted-foreground">Создано</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                                <p className="text-xs text-muted-foreground">Обновлено</p>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                                <p className="text-xs text-muted-foreground">Ошибок</p>
                            </div>
                        </div>

                        <ScrollArea className="h-[250px] border rounded-lg p-3">
                            <div className="space-y-2">
                                {result.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0"
                                    >
                                        {getStatusIcon(item)}
                                        <span className="font-mono text-xs">{item.cadastral_number}</span>
                                        <span className="text-muted-foreground">
                                            {item.status === "created" ? "создан" :
                                                item.status === "updated" ? "обновлён" : "ошибка"}
                                        </span>
                                        {getNspdStatusBadge(item.nspd_status)}
                                        {item.message && (
                                            <span className="text-red-500 text-xs">{item.message}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    {result ? (
                        <Button onClick={handleClose}>Закрыть</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                                Отмена
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isLoading || items.length === 0}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Импорт...
                                    </>
                                ) : (
                                    `Импортировать (${items.length})`
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
