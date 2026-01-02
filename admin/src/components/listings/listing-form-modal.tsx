"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PlotSearchInput } from "@/components/listings/plot-search-input";
import { SettlementSelect } from "@/components/locations/settlement-select";
import {
    ListingDetail,
    ListingCreate,
    createListing,
    updateListing,
    getListing,
    getRealtors,
    SettlementItem,
    RealtorItem,
    PlotShortItem,
    SettlementResolved,
} from "@/lib/api";

interface ListingFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listingId?: number | null;  // null = создание, number = редактирование
    onSuccess?: () => void;
}

export function ListingFormModal({
    open,
    onOpenChange,
    listingId,
    onSuccess,
}: ListingFormModalProps) {
    const isEditing = !!listingId;

    // Форма
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [realtorId, setRealtorId] = useState<string>("");

    // Выбранный населенный пункт (объект)
    const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);

    const [isPublished, setIsPublished] = useState(false);
    const [isFeatured, setIsFeatured] = useState(false);
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [selectedPlots, setSelectedPlots] = useState<PlotShortItem[]>([]);

    // Справочники
    const [realtors, setRealtors] = useState<RealtorItem[]>([]);

    // Состояние
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Загрузка справочников и данных объявления
    useEffect(() => {
        if (open) {
            setIsLoadingData(true);

            const loadData = async () => {
                try {
                    // Загружаем риэлторов (населенные пункты ищем через автокомплит)
                    const realtorsData = await getRealtors();
                    setRealtors(realtorsData);

                    // Если редактирование — загружаем объявление
                    if (listingId) {
                        const listing = await getListing(listingId);
                        setTitle(listing.title);
                        setDescription(listing.description || "");
                        setRealtorId(String(listing.realtor_id));

                        // Устанавливаем выбранный НП
                        setSelectedSettlement(listing.settlement);

                        setIsPublished(listing.is_published);
                        setIsFeatured(listing.is_featured);
                        setMetaTitle(listing.meta_title || "");
                        setMetaDescription(listing.meta_description || "");
                        setSelectedPlots(listing.plots || []);
                    } else {
                        // Сброс формы
                        resetForm();
                    }
                } catch (error) {
                    toast.error("Ошибка загрузки данных");
                    console.error(error);
                } finally {
                    setIsLoadingData(false);
                }
            };

            loadData();
        }
    }, [open, listingId]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setRealtorId("");
        setSelectedSettlement(null);
        setIsPublished(false);
        setIsFeatured(false);
        setMetaTitle("");
        setMetaDescription("");
        setSelectedPlots([]);
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Валидация
        if (!title.trim()) {
            toast.error("Введите название объявления");
            return;
        }
        if (!realtorId) {
            toast.error("Выберите риэлтора");
            return;
        }

        setIsLoading(true);

        try {
            const data: ListingCreate = {
                title: title.trim(),
                description: description || null,
                realtor_id: parseInt(realtorId),
                settlement_id: selectedSettlement ? selectedSettlement.id : null,
                is_published: isPublished,
                is_featured: isFeatured,
                meta_title: metaTitle.trim() || null,
                meta_description: metaDescription.trim() || null,
                plot_ids: selectedPlots.map(p => p.id),
            };

            if (isEditing && listingId) {
                await updateListing(listingId, data);
                toast.success("Объявление обновлено");
            } else {
                await createListing(data);
                toast.success("Объявление создано");
            }

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Редактирование объявления" : "Новое объявление"}
                    </DialogTitle>
                </DialogHeader>

                {isLoadingData ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Tabs defaultValue="main" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="main">Основное</TabsTrigger>
                                <TabsTrigger value="plots">Участки</TabsTrigger>
                                <TabsTrigger value="seo">SEO</TabsTrigger>
                            </TabsList>

                            {/* Основная информация */}
                            <TabsContent value="main" className="space-y-4 mt-4">
                                {/* Название */}
                                <div className="space-y-2">
                                    <Label htmlFor="title">Название *</Label>
                                    <Input
                                        id="title"
                                        placeholder="Земельный участок у моря в Янтарном"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Описание */}
                                <div className="space-y-2">
                                    <Label>Описание</Label>
                                    <RichTextEditor
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Подробное описание объявления..."
                                    />
                                </div>

                                {/* Риэлтор и Населённый пункт */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Риэлтор *</Label>
                                        <Select value={realtorId} onValueChange={setRealtorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите риэлтора" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {realtors.map((realtor) => (
                                                    <SelectItem key={realtor.id} value={String(realtor.id)}>
                                                        {realtor.name} {realtor.company ? `(${realtor.company})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Населённый пункт</Label>
                                        <SettlementSelect
                                            value={selectedSettlement}
                                            onSelect={(settlement) => setSelectedSettlement(settlement as any)} // Cast needed because SettlementResolved is slightly different from SettlementItem but compatible enough for UI display logic in Select
                                        />
                                    </div>
                                </div>

                                {/* Статусы */}
                                <div className="flex items-center gap-8 pt-4">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="is_published"
                                            checked={isPublished}
                                            onCheckedChange={setIsPublished}
                                        />
                                        <Label htmlFor="is_published" className="cursor-pointer">
                                            Опубликовано
                                        </Label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="is_featured"
                                            checked={isFeatured}
                                            onCheckedChange={setIsFeatured}
                                        />
                                        <Label htmlFor="is_featured" className="cursor-pointer">
                                            Спецпредложение
                                        </Label>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Участки */}
                            <TabsContent value="plots" className="mt-4">
                                <div className="space-y-2">
                                    <Label>Привязанные участки</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Найдите участки по кадастровому номеру или создайте новые.
                                    </p>
                                    <PlotSearchInput
                                        selectedPlots={selectedPlots}
                                        onPlotsChange={setSelectedPlots}
                                        listingId={listingId || undefined}
                                    />
                                </div>
                            </TabsContent>

                            {/* SEO */}
                            <TabsContent value="seo" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meta_title">SEO заголовок</Label>
                                    <Input
                                        id="meta_title"
                                        placeholder="Оставьте пустым для автогенерации из названия"
                                        value={metaTitle}
                                        onChange={(e) => setMetaTitle(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Рекомендуемая длина: 50-60 символов
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="meta_description">SEO описание</Label>
                                    <Textarea
                                        id="meta_description"
                                        placeholder="Краткое описание для поисковых систем..."
                                        value={metaDescription}
                                        onChange={(e) => setMetaDescription(e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Рекомендуемая длина: 150-160 символов
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Сохранить" : "Создать"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
