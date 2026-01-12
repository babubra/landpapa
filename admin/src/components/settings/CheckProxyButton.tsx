import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, Wifi } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";

interface CheckProxyButtonProps {
    proxy: string;
}

interface CheckResult {
    success: boolean;
    status_code: number | null;
    ip: string | null;
    error: string | null;
    elapsed_ms: number;
}

export function CheckProxyButton({ proxy }: CheckProxyButtonProps) {
    const [open, setOpen] = useState(false);
    const [testUrl, setTestUrl] = useState("https://api.ipify.org?format=json");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CheckResult | null>(null);

    const handleCheck = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await fetchWithAuth("/api/admin/settings/check-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proxy, test_url: testUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Ошибка проверки прокси");
            }

            const data = await response.json();
            setResult(data);

            if (data.success) {
                toast.success(`Прокси работает! IP: ${data.ip || 'Не определен'}`);
            } else {
                toast.error(`Ошибка подключения: ${data.error || 'Неизвестная ошибка'}`);
            }

        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Ошибка проверки");
            setResult({
                success: false,
                status_code: null,
                ip: null,
                error: e instanceof Error ? e.message : "Ошибка сети",
                elapsed_ms: 0
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Wifi className="h-4 w-4" />
                    Проверить
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Проверка прокси</DialogTitle>
                    <DialogDescription>
                        Проверьте доступность внешнего ресурса через указанный прокси.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>URL для проверки</Label>
                        <Input
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            placeholder="https://example.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Рекомендуется использовать сервис, возвращающий IP (например: api.ipify.org)
                        </p>
                    </div>

                    {result && (
                        <div className={`rounded-lg border p-3 text-sm ${result.success ? "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900" : "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900"
                            }`}>
                            <div className="flex items-start gap-3">
                                {result.success ? (
                                    <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                                ) : (
                                    <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
                                )}
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {result.success ? "Соединение установлено" : "Ошибка подключения"}
                                    </p>

                                    {result.ip && (
                                        <p>IP адрес: <span className="font-mono">{result.ip}</span></p>
                                    )}

                                    {result.status_code && (
                                        <p>Код ответа: {result.status_code}</p>
                                    )}

                                    <p>Время ответа: {Math.round(result.elapsed_ms)} мс</p>

                                    {result.error && (
                                        <p className="text-red-600 break-all">{result.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Закрыть</Button>
                    <Button onClick={handleCheck} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Запустить проверку
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
