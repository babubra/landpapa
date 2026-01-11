"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSettings, updateSetting, SettingItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, FileText } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Конфигурация страниц для редактирования
const PAGE_CONFIGS = [
    {
        key: "privacy_policy",
        label: "Политика конфиденциальности",
        description: "Текст политики конфиденциальности, отображаемый на странице /privacy",
        url: "/privacy",
    },
    {
        key: "about_page",
        label: "О нас",
        description: "Контент страницы «О нас», отображаемый на странице /about",
        url: "/about",
    },
];

export default function PagesPage() {
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
            toast.success("Страница сохранена");

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
                            <FileText className="h-6 w-6" />
                            <h1 className="text-xl font-bold">Страницы сайта</h1>
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
                    <div className="max-w-4xl space-y-8">
                        {PAGE_CONFIGS.map((config) => (
                            <div key={config.key} className="bg-card rounded-lg border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-semibold">{config.label}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {config.description}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => handleSave(config.key)}
                                        disabled={saving === config.key}
                                    >
                                        {saving === config.key ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Сохранить
                                    </Button>
                                </div>

                                <RichTextEditor
                                    value={values[config.key] || ""}
                                    onChange={(html) =>
                                        setValues((prev) => ({ ...prev, [config.key]: html }))
                                    }
                                    className="bg-background min-h-[400px]"
                                />

                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        URL страницы:{" "}
                                        <code className="bg-muted px-1.5 py-0.5 rounded">
                                            {config.url}
                                        </code>
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Info */}
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Совет:</strong> Используйте визуальный редактор для форматирования текста.
                                Вы можете добавлять заголовки, списки, ссылки и другие элементы.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
