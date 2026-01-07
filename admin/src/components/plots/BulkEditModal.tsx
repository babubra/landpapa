"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit } from "lucide-react";
import { bulkUpdatePlots, getReferences, Reference } from "@/lib/api";
import { toast } from "sonner";

interface BulkEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedIds: number[];
    onSuccess: () => void;
}

export function BulkEditModal({
    open,
    onOpenChange,
    selectedIds,
    onSuccess,
}: BulkEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [landUseId, setLandUseId] = useState<string>("");
    const [landCategoryId, setLandCategoryId] = useState<string>("");
    const [pricePublic, setPricePublic] = useState<string>("");

    const [landUses, setLandUses] = useState<Reference[]>([]);
    const [landCategories, setLandCategories] = useState<Reference[]>([]);

    // Загрузка справочников
    useEffect(() => {
        if (open) {
            getReferences("land_use").then(setLandUses).catch(console.error);
            getReferences("land_category").then(setLandCategories).catch(console.error);
        }
    }, [open]);

    const resetForm = () => {
        setLandUseId("");
        setLandCategoryId("");
        setPricePublic("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasChanges = landUseId || landCategoryId || pricePublic;
        if (!hasChanges) {
            toast.error("Выберите хотя бы одно поле для обновления");
            return;
        }

        setIsLoading(true);
        try {
            const result = await bulkUpdatePlots({
                plot_ids: selectedIds,
                land_use_id: landUseId ? parseInt(landUseId) : undefined,
                land_category_id: landCategoryId ? parseInt(landCategoryId) : undefined,
                price_public: pricePublic ? parseInt(pricePublic) : undefined,
            });
            toast.success(`Обновлено участков: ${result.updated_count}`);
            resetForm();
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка обновления");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!isLoading) {
                resetForm();
                onOpenChange(open);
            }
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Массовое редактирование
                    </DialogTitle>
                    <DialogDescription>
                        Выбрано участков: <strong>{selectedIds.length}</strong>.
                        Заполните только те поля, которые хотите изменить.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Разрешённое использование */}
                        <div className="grid gap-2">
                            <Label htmlFor="landUse">Разрешённое использование</Label>
                            <Select value={landUseId} onValueChange={setLandUseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Не изменять" />
                                </SelectTrigger>
                                <SelectContent>
                                    {landUses.map((item) => (
                                        <SelectItem key={item.id} value={String(item.id)}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Категория земель */}
                        <div className="grid gap-2">
                            <Label htmlFor="landCategory">Категория земель</Label>
                            <Select value={landCategoryId} onValueChange={setLandCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Не изменять" />
                                </SelectTrigger>
                                <SelectContent>
                                    {landCategories.map((item) => (
                                        <SelectItem key={item.id} value={String(item.id)}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Цена */}
                        <div className="grid gap-2">
                            <Label htmlFor="price">Цена (₽)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                value={pricePublic}
                                onChange={(e) => setPricePublic(e.target.value)}
                                placeholder="Не изменять"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Обновление...
                                </>
                            ) : (
                                `Обновить (${selectedIds.length})`
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
