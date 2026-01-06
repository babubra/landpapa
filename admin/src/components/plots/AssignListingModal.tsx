"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AssignListingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onAssign: (listingId: number) => Promise<void>;
}

export function AssignListingModal({
    open,
    onOpenChange,
    selectedCount,
    onAssign,
}: AssignListingModalProps) {
    const [listingId, setListingId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const id = parseInt(listingId);
        if (isNaN(id) || id <= 0) {
            setError("Введите корректный ID объявления");
            return;
        }

        setIsLoading(true);
        try {
            await onAssign(id);
            setListingId("");
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка привязки");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] z-[9999]">
                <DialogHeader>
                    <DialogTitle>Привязать к объявлению</DialogTitle>
                    <DialogDescription>
                        Выбрано участков: <strong>{selectedCount}</strong>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="listingId">ID объявления</Label>
                            <Input
                                id="listingId"
                                type="number"
                                min="1"
                                value={listingId}
                                onChange={(e) => setListingId(e.target.value)}
                                placeholder="Введите ID объявления"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading || !listingId}>
                            {isLoading ? "Привязка..." : "Привязать"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
