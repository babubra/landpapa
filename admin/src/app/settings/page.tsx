"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSettings, updateSetting, SettingItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<SettingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Локальные значения для редактирования
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            setSettings(data.items);

            // Инициализируем локальные значения
            const initialValues: Record<string, string> = {};
            data.items.forEach((s) => {
                initialValues[s.key] = s.value || "";
            });
            setValues(initialValues);
        } catch (error: any) {
            toast.error(error.message || "Ошибка загрузки настроек");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string) => {
        setSaving(key);
        try {
            const newValue = values[key] || null;
            await updateSetting(key, newValue);
            toast.success("Настройка сохранена");

            // Обновляем локальное состояние
            setSettings((prev) =>
                prev.map((s) =>
                    s.key === key ? { ...s, value: newValue } : s
                )
            );
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setSaving(null);
        }
    };

    const getSettingLabel = (key: string) => {
        const labels: Record<string, string> = {
            nspd_proxy: "Прокси для NSPD",
            nspd_timeout: "Таймаут NSPD (сек)",
            dadata_api_key: "API ключ DaData",
        };
        return labels[key] || key;
    };

    const getPlaceholder = (key: string) => {
        const placeholders: Record<string, string> = {
            nspd_proxy: "user:pass@host:port",
            nspd_timeout: "10",
            dadata_api_key: "Введите API ключ от dadata.ru",
        };
        return placeholders[key] || "";
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <SettingsIcon className="h-6 w-6" />
                            <h1 className="text-xl font-bold">Настройки</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-2xl space-y-8">
                        {/* NSPD Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Интеграция NSPD
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Настройки подключения к геопорталу nspd.gov.ru для получения координат участков.
                            </p>

                            <div className="space-y-4">
                                {settings
                                    .filter((s) => s.key.startsWith("nspd_"))
                                    .map((setting) => (
                                        <div key={setting.key} className="space-y-2">
                                            <Label htmlFor={setting.key}>
                                                {getSettingLabel(setting.key)}
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={setting.key}
                                                    value={values[setting.key] || ""}
                                                    placeholder={getPlaceholder(setting.key)}
                                                    onChange={(e) =>
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [setting.key]: e.target.value,
                                                        }))
                                                    }
                                                    className="flex-1"
                                                />
                                                <Button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={saving === setting.key}
                                                >
                                                    {saving === setting.key ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {setting.description && (
                                                <p className="text-xs text-muted-foreground">
                                                    {setting.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* DaData Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Интеграция DaData
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                API ключ для поиска населённых пунктов через сервис dadata.ru.
                            </p>

                            <div className="space-y-4">
                                {settings
                                    .filter((s) => s.key.startsWith("dadata_"))
                                    .map((setting) => (
                                        <div key={setting.key} className="space-y-2">
                                            <Label htmlFor={setting.key}>
                                                {getSettingLabel(setting.key)}
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={setting.key}
                                                    value={values[setting.key] || ""}
                                                    placeholder={getPlaceholder(setting.key)}
                                                    onChange={(e) =>
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [setting.key]: e.target.value,
                                                        }))
                                                    }
                                                    className="flex-1"
                                                    type={setting.key.includes("key") ? "password" : "text"}
                                                />
                                                <Button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={saving === setting.key}
                                                >
                                                    {saving === setting.key ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {setting.description && (
                                                <p className="text-xs text-muted-foreground">
                                                    {setting.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Важно:</strong> После изменения настроек клиенты будут пересозданы при следующем запросе.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
