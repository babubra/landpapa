"use client";

import { useState, useRef } from "react";
import { Image as ImageType, uploadImage, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { X, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
    value: ImageType[];
    onChange: (value: ImageType[]) => void;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const newImages: ImageType[] = [];
        const errors: string[] = [];

        try {
            // Загружаем файлы последовательно (или параллельно, но лучше последовательно для порядка, хотя порядок определится добавлением)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    // Валидация на клиенте
                    if (!file.type.startsWith("image/")) {
                        errors.push(`${file.name}: не изображение`);
                        continue;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        errors.push(`${file.name}: больше 5MB`);
                        continue;
                    }

                    const image = await uploadImage(file);
                    newImages.push(image);
                } catch (err: any) {
                    errors.push(`${file.name}: ${err.message}`);
                }
            }

            if (newImages.length > 0) {
                onChange([...value, ...newImages]);
                toast.success(`Загружено изображений: ${newImages.length}`);
            }

            if (errors.length > 0) {
                toast.error("Ошибки при загрузке", {
                    description: errors.join("\n")
                });
            }

        } catch (error) {
            console.error(error);
            toast.error("Ошибка загрузки");
        } finally {
            setIsUploading(false);
            // Сброс input, чтобы можно было выбрать те же файлы снова
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemove = (image: ImageType) => {
        onChange(value.filter((i) => i.id !== image.id));
    };

    const moveImage = (index: number, direction: "left" | "right") => {
        const newIndex = direction === "left" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= value.length) return;

        const newImages = [...value];
        const [movedImage] = newImages.splice(index, 1);
        newImages.splice(newIndex, 0, movedImage);
        onChange(newImages);
    };

    // Формируем URL. Image.url приходит с бэкенда как "/uploads/filename.jpg".
    // В production используется относительный путь (API_URL = ""), в dev - полный URL
    const getImageUrl = (url: string) => {
        if (url.startsWith("http")) return url;
        // Удаляем trailing slash из API_URL
        const cleanApiUrl = API_URL.replace(/\/$/, "");
        return `${cleanApiUrl}${url}`;
    };

    return (
        <div className="space-y-4">
            {/* Grid изображений */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {value.map((image, index) => (
                    <div key={image.id} className="relative group aspect-square border rounded-md overflow-hidden bg-muted">
                        <Image
                            src={getImageUrl(image.thumbnail_url || image.url)}
                            alt="Image"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            unoptimized
                        />

                        {/* Overlay actions */}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center text-white">
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-white/20 hover:text-white"
                                    onClick={() => moveImage(index, "left")}
                                    disabled={index === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-white/20 hover:text-white"
                                    onClick={() => moveImage(index, "right")}
                                    disabled={index === value.length - 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemove(image)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Кнопка загрузки (как плитка) */}
                <div
                    className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground relative"
                    onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*"
                        disabled={disabled || isUploading}
                    />

                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                        <>
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm font-medium">Загрузить</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
