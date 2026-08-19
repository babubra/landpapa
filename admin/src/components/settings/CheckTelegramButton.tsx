"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";

interface CheckResult {
    success: boolean;
    error: string | null;
    proxy: string | null;
    elapsed_ms: number;
}

/**
 * Отправляет тестовое уведомление в Telegram текущими сохранёнными настройками.
 * Нужна, чтобы после заполнения прокси сразу видеть, доходит ли сообщение.
 */
export function CheckTelegramButton() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CheckResult | null>(null);

    const handleCheck = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await fetchWithAuth("/api/admin/settings/check-telegram", {
                method: "POST",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Ошибка проверки");
            }

            const data: CheckResult = await response.json();
            setResult(data);

            if (data.success) {
                toast.success("Сообщение отправлено — проверьте чат в Telegram");
            } else {
                toast.error(data.error || "Отправить не удалось");
            }
        } catch (e) {
            const error = e instanceof Error ? e.message : "Ошибка сети";
            toast.error(error);
            setResult({ success: false, error, proxy: null, elapsed_ms: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Проверить отправку
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Проверка уведомлений в Telegram</DialogTitle>
                    <DialogDescription>
                        В чат уйдёт тестовое сообщение. Проверяются сохранённые настройки — если вы
                        только что меняли поля, сначала сохраните их кнопкой с дискетой.
                    </DialogDescription>
                </DialogHeader>

                {result && (
                    <div className={`rounded-lg border p-3 text-sm ${result.success
                        ? "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900"
                        : "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900"
                        }`}>
                        <div className="flex items-start gap-3">
                            {result.success ? (
                                <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                            ) : (
                                <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
                            )}
                            <div className="space-y-1">
                                <p className="font-medium">
                                    {result.success ? "Сообщение отправлено" : "Отправить не удалось"}
                                </p>
                                <p>Прокси: <span className="font-mono">{result.proxy || "не используется"}</span></p>
                                <p>Время ответа: {Math.round(result.elapsed_ms)} мс</p>
                                {result.error && (
                                    <p className="text-red-600 break-all">{result.error}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Закрыть</Button>
                    <Button onClick={handleCheck} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Отправить тестовое
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
