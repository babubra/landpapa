"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSettings, updateSetting, SettingItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, Search } from "lucide-react";
import { ImageSettingUpload } from "@/components/settings/ImageSettingUpload";

export default function SeoSettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<SettingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
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

            setSettings((prev) => {
                const existing = prev.find(s => s.key === key);
                if (existing) {
                    return prev.map(s => s.key === key ? { ...s, value: newValue } : s);
                } else {
                    // Если настройки не было, добавляем её (так как бэкенд теперь поддерживает upsert)
                    return [...prev, { key, value: newValue, description: null, updated_at: new Date().toISOString() }];
                }
            });
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setSaving(null);
        }
    };

    const handleImageUpdate = (key: string, newUrl: string) => {
        setValues((prev) => ({ ...prev, [key]: newUrl }));
        // Автосохранение для картинок не делаем, пользователь должен нажать кнопку, или можно сделать как в SettingsPage
        // В SettingsPage ImageSettingUpload сам вызывает onUpdate, но там мы обновляем state.
        // Здесь мы просто обновляем state, а сохранение по кнопке Save рядом с полем, если бы это было текстовое поле.
        // Но ImageSettingUpload обычно подразумевает выбор.
        // Давайте сделаем кнопку "Сохранить" для картинки явной или используем тот же паттерн что и в SettingsPage
        // В SettingsPage ImageSettingUpload просто обновляет value, а сохранять надо отдельно?
        // Проверим SettingsPage... Там ImageSettingUpload просто обновляет локальный стейт, но кнопки "Save" для картинки НЕТ?
        // А, там ImageSettingUpload внутри себя имеет кнопку? Нет.
        // В SettingsPage: `onUpdate={(url) => handleImageUpdate("hero_image", url)}` -> обновляет state.
        // И там НЕТ кнопки Save для блока картинки! Значит ImageSettingUpload должен иметь кнопку или автосейв?
        // Взглянем на ImageSettingUpload снова... Нет, в SettingsPage НЕТ кнопки сохранения для картинок Hero и Placeholder.
        // Это баг в SettingsPage? Или ImageSettingUpload делает что-то еще?
        // В SettingsPage renderImageSetting... нет такого, там просто компонент.
        // Ладно, добавим явную кнопку сохранения для OG Image здесь.
    };

    // Специальный обработчик для сохранения картинки, так как ImageSettingUpload возвращает URL
    const saveImage = async (key: string, url: string) => {
        setSaving(key);
        try {
            await updateSetting(key, url);
            toast.success("Изображение сохранено");
            setSettings((prev) => {
                const existing = prev.find(s => s.key === key);
                if (existing) {
                    return prev.map(s => s.key === key ? { ...s, value: url } : s);
                } else {
                    return [...prev, { key, value: url, description: null, updated_at: new Date().toISOString() }];
                }
            });
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setSaving(null);
        }
    }


    const renderTextSetting = (key: string, label: string, placeholder: string, multiline = false) => {
        return (
            <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <div className="flex gap-2 items-start">
                    {multiline ? (
                        <Textarea
                            id={key}
                            value={values[key] || ""}
                            placeholder={placeholder}
                            onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="flex-1 min-h-[100px]"
                        />
                    ) : (
                        <Input
                            id={key}
                            value={values[key] || ""}
                            placeholder={placeholder}
                            onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="flex-1"
                        />
                    )}
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
                            <Search className="h-6 w-6" />
                            <h1 className="text-xl font-bold">SEO Настройки</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-3xl space-y-8">
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">Основные мета-теги</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Эти настройки влияют на отображение сайта в поисковой выдаче (Google, Yandex).
                            </p>

                            <div className="space-y-6">
                                {renderTextSetting(
                                    "site_title",
                                    "Заголовок страницы (Title)",
                                    "Например: Земельные участки в Калининграде"
                                )}
                                {renderTextSetting(
                                    "site_description",
                                    "Описание (Meta Description)",
                                    "Краткое описание для сниппета в поиске (рекомендуется 150-160 символов)",
                                    true
                                )}
                                {renderTextSetting(
                                    "site_keywords",
                                    "Ключевые слова (Meta Keywords)",
                                    "Например: участки, ижс, калининград, купить землю",
                                    true
                                )}
                            </div>
                        </div>

                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">Социальные сети (Open Graph)</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Настройка отображения ссылок на сайт при отправке в мессенджеры и соцсети.
                            </p>

                            <div className="space-y-6">
                                <ImageSettingUpload
                                    settingKey="og_image"
                                    label="OG Изображение"
                                    description="Картинка, которая будет показана при шеринге ссылки (рекомендуется 1200x630)"
                                    currentValue={values["og_image"] || ""}
                                    onUpdate={(url) => {
                                        handleImageUpdate("og_image", url);
                                        saveImage("og_image", url); // Сразу сохраняем
                                    }}
                                />
                            </div>
                        </div>

                        {/* SEO-текст на главной странице */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">SEO-текст на главной странице</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Текстовый блок для главной страницы. Рекомендуется 300-400 слов с ключевыми фразами.
                                Используйте HTML-теги: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt; для структурирования.
                            </p>
                            <div className="space-y-6">
                                {renderTextSetting(
                                    "seo_homepage_text",
                                    "Текст на главной",
                                    "<h2>Заголовок</h2><p>Параграф текста...</p>",
                                    true
                                )}
                            </div>
                        </div>

                        {/* Метаданные страниц */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">Метаданные страниц</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Заголовки и описания для отдельных страниц сайта. Если не заполнено — используются значения по умолчанию.
                            </p>
                            <div className="space-y-8">
                                {/* Каталог */}
                                <div className="space-y-4 pb-6 border-b">
                                    <h3 className="font-medium text-muted-foreground">📋 Каталог</h3>
                                    {renderTextSetting(
                                        "seo_catalog_title",
                                        "Заголовок (Title)",
                                        "Каталог земельных участков"
                                    )}
                                    {renderTextSetting(
                                        "seo_catalog_description",
                                        "Описание (Description)",
                                        "Все земельные участки в Калининградской области...",
                                        true
                                    )}
                                </div>

                                {/* О нас */}
                                <div className="space-y-4 pb-6 border-b">
                                    <h3 className="font-medium text-muted-foreground">ℹ️ О нас</h3>
                                    {renderTextSetting(
                                        "seo_about_title",
                                        "Заголовок (Title)",
                                        "О компании"
                                    )}
                                    {renderTextSetting(
                                        "seo_about_description",
                                        "Описание (Description)",
                                        "Информация о нашей компании...",
                                        true
                                    )}
                                </div>

                                {/* Контакты */}
                                <div className="space-y-4 pb-6 border-b">
                                    <h3 className="font-medium text-muted-foreground">📞 Контакты</h3>
                                    {renderTextSetting(
                                        "seo_contacts_title",
                                        "Заголовок (Title)",
                                        "Контакты"
                                    )}
                                    {renderTextSetting(
                                        "seo_contacts_description",
                                        "Описание (Description)",
                                        "Свяжитесь с нами...",
                                        true
                                    )}
                                </div>

                                {/* Новости */}
                                <div className="space-y-4 pb-6 border-b">
                                    <h3 className="font-medium text-muted-foreground">📰 Новости</h3>
                                    {renderTextSetting(
                                        "seo_news_title",
                                        "Заголовок (Title)",
                                        "Новости"
                                    )}
                                    {renderTextSetting(
                                        "seo_news_description",
                                        "Описание (Description)",
                                        "Актуальные новости рынка недвижимости...",
                                        true
                                    )}
                                </div>

                                {/* Карта */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-muted-foreground">🗺️ Карта</h3>
                                    {renderTextSetting(
                                        "seo_map_title",
                                        "Заголовок (Title)",
                                        "Карта участков"
                                    )}
                                    {renderTextSetting(
                                        "seo_map_description",
                                        "Описание (Description)",
                                        "Интерактивная карта земельных участков...",
                                        true
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ссылки на соцсети */}
                        <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-lg font-semibold mb-4">Ссылки на соцсети</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Ссылки на ваши страницы в социальных сетях. Используются в Schema.org разметке.
                            </p>
                            <div className="space-y-6">
                                {renderTextSetting(
                                    "org_vk_url",
                                    "VK",
                                    "https://vk.com/your_group"
                                )}
                                {renderTextSetting(
                                    "org_telegram_url",
                                    "Telegram",
                                    "https://t.me/your_channel"
                                )}
                                {renderTextSetting(
                                    "org_max_url",
                                    "Max",
                                    "https://max.ru/your_profile"
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
