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
import { ImageSettingUpload } from "@/components/settings/ImageSettingUpload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CheckProxyButton } from "@/components/settings/CheckProxyButton";

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

    const handleImageUpdate = (key: string, newUrl: string) => {
        setValues((prev) => ({ ...prev, [key]: newUrl }));
        setSettings((prev) =>
            prev.map((s) => (s.key === key ? { ...s, value: newUrl } : s))
        );
    };

    const handleTextUpdate = (key: string, value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const getSettingLabel = (key: string) => {
        const labels: Record<string, string> = {
            nspd_proxy: "Прокси для NSPD",
            nspd_timeout: "Таймаут NSPD (сек)",
            dadata_api_key: "API ключ DaData",
            site_name: "Название бренда (у логотипа)",
            site_subtitle: "Подзаголовок (у логотипа)",
            site_phone: "Телефон",
            hero_title: "Заголовок Hero",
            hero_subtitle: "Подзаголовок Hero",
            site_email: "Email (футер)",
            site_address: "Адрес (футер)",
            site_work_hours_weekdays: "Режим работы (будни)",
            site_work_hours_weekend: "Режим работы (выходные)",
            tg_bot_token: "Telegram Bot Token",
            tg_chat_id: "Telegram Chat ID",
        };
        return labels[key] || key;
    };

    const getPlaceholder = (key: string) => {
        const placeholders: Record<string, string> = {
            nspd_proxy: "user:pass@host:port",
            nspd_timeout: "10",
            dadata_api_key: "Введите API ключ от dadata.ru",
            site_name: "РКК Лэнд",
            site_subtitle: "Земельные участки",
            site_phone: "+7 (4012) 12-34-56",
            hero_title: "Земельные участки в Калининградской области",
            hero_subtitle: "Найдите идеальный участок...",
            site_email: "info@example.com",
            site_address: "г. Калининград, ул. Примерная, д. 1",
            site_work_hours_weekdays: "Пн–Пт: 9:00 – 18:00",
            site_work_hours_weekend: "Сб: 10:00 – 16:00, Вс: выходной",
            tg_bot_token: "123456789:ABCDefGhI... (от @BotFather)",
            tg_chat_id: "-100123456789 или ID пользователя",
        };
        return placeholders[key] || "";
    };


    // Рендер текстового поля настройки
    const renderTextSetting = (key: string) => {
        const setting = settings.find((s) => s.key === key);
        if (!setting) return null;

        if (key === "nspd_proxy") {
            return (
                <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{getSettingLabel(key)}</Label>
                    <div className="flex gap-2">
                        <Input
                            id={key}
                            value={values[key] || ""}
                            placeholder={getPlaceholder(key)}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                }))
                            }
                            className="flex-1"
                        />
                        <CheckProxyButton proxy={values[key] || ""} />
                        <Button
                            onClick={() => handleSave(key)}
                            disabled={saving === key}
                        >
                            {saving === key ? (
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
            )
        }

        return (
            <div key={key} className="space-y-2">
                <Label htmlFor={key}>{getSettingLabel(key)}</Label>
                <div className="flex gap-2">
                    <Input
                        id={key}
                        value={values[key] || ""}
                        placeholder={getPlaceholder(key)}
                        onChange={(e) =>
                            setValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                            }))
                        }
                        className="flex-1"
                        type={key.includes("key") ? "password" : "text"}
                    />
                    <Button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                    >
                        {saving === key ? (
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
        );
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
                        {/* Site Settings Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Общие настройки сайта
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Название, подзаголовок и контактный телефон сайта.
                            </p>

                            <div className="space-y-4">
                                {renderTextSetting("site_name")}
                                {renderTextSetting("site_subtitle")}
                                {renderTextSetting("site_phone")}
                                {renderTextSetting("site_email")}
                                {renderTextSetting("site_address")}
                                {renderTextSetting("site_work_hours_weekdays")}
                                {renderTextSetting("site_work_hours_weekend")}

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Логотип (SVG код)
                                        </label>
                                        <Button
                                            onClick={() => handleSave("site_logo")}
                                            disabled={saving === "site_logo"}
                                            size="sm"
                                            className="h-7 px-3"
                                        >
                                            {saving === "site_logo" ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            ) : (
                                                <Save className="h-3 w-3 mr-1" />
                                            )}
                                            Сохранить
                                        </Button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">
                                                Вставьте код &lt;svg&gt;...&lt;/svg&gt; сюда.
                                                Убедитесь, что в коде есть <code>fill="currentColor"</code> для
                                                автоматической смены цвета.
                                            </p>
                                            <textarea
                                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                                value={values["site_logo"] || ""}
                                                onChange={(e) => handleTextUpdate("site_logo", e.target.value)}
                                                placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...'
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs text-muted-foreground">Предпросмотр:</p>
                                            <div className="flex items-center justify-center h-[120px] rounded-md border border-dashed bg-muted/50 p-4">
                                                {values["site_logo"] ? (
                                                    <div
                                                        className="h-10 w-auto text-foreground"
                                                        dangerouslySetInnerHTML={{ __html: values["site_logo"] }}
                                                    />
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Нет логотипа</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hero Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Главная страница
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Заголовок, подзаголовок и фоновое изображение Hero-секции.
                            </p>

                            <div className="space-y-4">
                                {renderTextSetting("hero_title")}
                                {renderTextSetting("hero_subtitle")}
                                <ImageSettingUpload
                                    settingKey="hero_image"
                                    label="Фоновое изображение Hero"
                                    description="Рекомендуемый размер: 1920x1080px"
                                    currentValue={values["hero_image"] || ""}
                                    onUpdate={(url) => handleImageUpdate("hero_image", url)}
                                />
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Изображения
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Изображение-заглушка для карточек объявлений без фото.
                            </p>

                            <div className="space-y-4">
                                <ImageSettingUpload
                                    settingKey="placeholder_image"
                                    label="Изображение-заглушка"
                                    description="Используется когда у объявления нет фото"
                                    currentValue={values["placeholder_image"] || ""}
                                    onUpdate={(url) => handleImageUpdate("placeholder_image", url)}
                                />
                            </div>
                        </div>

                        {/* Telegram Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Уведомления Telegram
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Настройки бота для получения мгновенных уведомлений о новых заявках.
                            </p>

                            <div className="space-y-4">
                                {renderTextSetting("tg_bot_token")}
                                {renderTextSetting("tg_chat_id")}
                            </div>
                        </div>

                        {/* NSPD Section */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                Интеграция NSPD
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Настройки подключения к геопорталу nspd.gov.ru для получения координат участков.
                            </p>

                            <div className="space-y-4">
                                {renderTextSetting("nspd_proxy")}
                                {renderTextSetting("nspd_timeout")}
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
                                {renderTextSetting("dadata_api_key")}
                            </div>
                        </div>

                        {/* Раздел "Юридические документы" перенесён в "Страницы сайта" */}

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
