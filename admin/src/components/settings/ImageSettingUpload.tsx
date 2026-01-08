"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Save, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadImage, updateSetting, API_URL } from "@/lib/api";

interface ImageSettingUploadProps {
    settingKey: string;
    label: string;
    description?: string;
    currentValue: string;
    onUpdate: (newUrl: string) => void;
}

export function ImageSettingUpload({
    settingKey,
    label,
    description,
    currentValue,
    onUpdate,
}: ImageSettingUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentValue);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFullImageUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${API_URL}${url}`;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith("image/")) {
            toast.error("Пожалуйста, выберите изображение");
            return;
        }

        // Проверка размера (макс 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Размер файла не должен превышать 5MB");
            return;
        }

        setIsUploading(true);
        try {
            const image = await uploadImage(file);
            const newUrl = image.url;
            setPreviewUrl(newUrl);

            // Автоматически сохраняем после загрузки
            setIsSaving(true);
            await updateSetting(settingKey, newUrl);
            onUpdate(newUrl);
            toast.success("Изображение загружено и сохранено");
        } catch (error: any) {
            toast.error(error.message || "Ошибка загрузки");
        } finally {
            setIsUploading(false);
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        setIsSaving(true);
        try {
            await updateSetting(settingKey, "");
            setPreviewUrl("");
            onUpdate("");
            toast.success("Изображение удалено");
        } catch (error: any) {
            toast.error(error.message || "Ошибка удаления");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <Label>{label}</Label>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </div>

            <div className="flex gap-4 items-start">
                {/* Превью изображения */}
                <div className="relative w-40 h-24 bg-muted rounded-md overflow-hidden border flex items-center justify-center">
                    {previewUrl ? (
                        <img
                            src={getFullImageUrl(previewUrl)}
                            alt={label}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    {(isUploading || isSaving) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                    )}
                </div>

                {/* Кнопки управления */}
                <div className="flex flex-col gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isSaving}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Загрузить
                    </Button>
                    {previewUrl && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemove}
                            disabled={isUploading || isSaving}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
