"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    getSeoBlocks,
    createSeoBlock,
    updateSeoBlock,
    deleteSeoBlock,
    getLocationsTree,
    getReferences,
    SeoBlockItem,
    SeoBlockCreate,
    SeoBlockUpdate,
    LocationTreeItem,
    Reference,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    LayoutGrid,
    GripVertical,
    Eye,
    EyeOff,
} from "lucide-react";

export default function SeoBlocksPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [blocks, setBlocks] = useState<SeoBlockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Справочники для формы
    const [locations, setLocations] = useState<LocationTreeItem[]>([]);
    const [landUseRefs, setLandUseRefs] = useState<Reference[]>([]);

    // Модальное окно
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<SeoBlockItem | null>(null);

    // Поля формы
    const [formTitle, setFormTitle] = useState("");
    const [formSubtitle, setFormSubtitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formLinkUrl, setFormLinkUrl] = useState("");
    const [formLocationId, setFormLocationId] = useState<number | null>(null);
    const [formLandUseFilter, setFormLandUseFilter] = useState("");
    const [formSortOrder, setFormSortOrder] = useState(0);
    const [formIsActive, setFormIsActive] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [blocksData, locationsData, refsData] = await Promise.all([
                getSeoBlocks(),
                getLocationsTree().catch(() => []),
                getReferences("land_use").catch(() => []),
            ]);
            setBlocks(blocksData);
            setLocations(locationsData);
            setLandUseRefs(refsData);
        } catch (error: any) {
            toast.error(error.message || "Ошибка загрузки данных");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingBlock(null);
        setFormTitle("");
        setFormSubtitle("");
        setFormDescription("");
        setFormLinkUrl("");
        setFormLocationId(null);
        setFormLandUseFilter("");
        setFormSortOrder(blocks.length);
        setFormIsActive(true);
        setDialogOpen(true);
    };

    const openEdit = (block: SeoBlockItem) => {
        setEditingBlock(block);
        setFormTitle(block.title);
        setFormSubtitle(block.subtitle || "");
        setFormDescription(block.description || "");
        setFormLinkUrl(block.link_url);
        setFormLocationId(block.location_id);
        setFormLandUseFilter(block.land_use_filter || "");
        setFormSortOrder(block.sort_order);
        setFormIsActive(block.is_active);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formLinkUrl.trim()) {
            toast.error("Заполните обязательные поля: заголовок и URL");
            return;
        }

        setSaving(true);
        try {
            const data = {
                title: formTitle.trim(),
                subtitle: formSubtitle.trim() || null,
                description: formDescription.trim() || null,
                link_url: formLinkUrl.trim(),
                location_id: formLocationId,
                land_use_filter: formLandUseFilter.trim() || null,
                sort_order: formSortOrder,
                is_active: formIsActive,
            };

            if (editingBlock) {
                await updateSeoBlock(editingBlock.id, data as SeoBlockUpdate);
                toast.success("SEO-блок обновлён");
            } else {
                await createSeoBlock(data as SeoBlockCreate);
                toast.success("SEO-блок создан");
            }

            setDialogOpen(false);
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (block: SeoBlockItem) => {
        if (!confirm(`Удалить блок «${block.title}»?`)) return;

        try {
            await deleteSeoBlock(block.id);
            toast.success("SEO-блок удалён");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Ошибка удаления");
        }
    };

    const handleToggleActive = async (block: SeoBlockItem) => {
        try {
            await updateSeoBlock(block.id, { is_active: !block.is_active });
            toast.success(block.is_active ? "Блок скрыт" : "Блок активирован");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Ошибка");
        }
    };

    // Рекурсивный рендер дерева локаций для <select>
    const renderLocationOptions = (items: LocationTreeItem[], depth = 0): React.ReactNode[] => {
        const result: React.ReactNode[] = [];
        for (const item of items) {
            const prefix = "\u00A0\u00A0".repeat(depth);
            const typeLabel = { region: "Обл.", district: "р-н", city: "г.", settlement: "" }[item.type] || "";
            result.push(
                <option key={item.id} value={item.id}>
                    {prefix}{typeLabel ? `[${typeLabel}] ` : ""}{item.name}
                </option>
            );
            if (item.children?.length > 0) {
                result.push(...renderLocationOptions(item.children, depth + 1));
            }
        }
        return result;
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
                            onClick={() => router.push("/components/home")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="h-6 w-6" />
                            <h1 className="text-xl font-bold">SEO-блоки</h1>
                        </div>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить блок
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : blocks.length === 0 ? (
                    <div className="text-center py-12">
                        <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-lg font-semibold mb-2">Нет SEO-блоков</h2>
                        <p className="text-muted-foreground mb-4">
                            SEO-блоки отображаются на главной странице сайта
                        </p>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Создать первый блок
                        </Button>
                    </div>
                ) : (
                    <div className="max-w-4xl space-y-3">
                        {blocks.map((block) => (
                            <Card
                                key={block.id}
                                className={`p-4 flex items-center gap-4 ${!block.is_active ? "opacity-50" : ""
                                    }`}
                            >
                                <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold truncate">{block.title}</h3>
                                        {!block.is_active && (
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                                Скрыт
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span>→ {block.link_url}</span>
                                        {block.location && (
                                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                                                📍 {block.location.name}
                                            </span>
                                        )}
                                        {block.land_use_filter && (
                                            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs">
                                                🏷️ {block.land_use_filter}
                                            </span>
                                        )}
                                        <span className="text-xs">#{block.sort_order}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleActive(block)}
                                        title={block.is_active ? "Скрыть" : "Показать"}
                                    >
                                        {block.is_active ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <EyeOff className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEdit(block)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(block)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}

                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mt-6">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Как это работает:</strong> Блоки отображаются на главной
                                странице в указанном порядке. Для каждого блока автоматически
                                подбираются 4 объявления: сначала избранные, затем самые свежие.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Модальное окно создания/редактирования */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBlock ? "Редактировать SEO-блок" : "Создать SEO-блок"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {/* Заголовок */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Заголовок *</Label>
                            <Input
                                id="title"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="Участки в Зеленоградском районе"
                            />
                        </div>

                        {/* Подзаголовок */}
                        <div className="space-y-2">
                            <Label htmlFor="subtitle">Подзаголовок</Label>
                            <Input
                                id="subtitle"
                                value={formSubtitle}
                                onChange={(e) => setFormSubtitle(e.target.value)}
                                placeholder="Лучшие предложения у моря"
                            />
                        </div>

                        {/* URL */}
                        <div className="space-y-2">
                            <Label htmlFor="linkUrl">URL кнопки «Смотреть все» *</Label>
                            <Input
                                id="linkUrl"
                                value={formLinkUrl}
                                onChange={(e) => setFormLinkUrl(e.target.value)}
                                placeholder="/catalog?location_id=5"
                            />
                        </div>

                        {/* Локация */}
                        <div className="space-y-2">
                            <Label htmlFor="location">Локация (фильтр)</Label>
                            <select
                                id="location"
                                value={formLocationId ?? ""}
                                onChange={(e) =>
                                    setFormLocationId(
                                        e.target.value ? Number(e.target.value) : null
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">— Все локации —</option>
                                {renderLocationOptions(locations)}
                            </select>
                        </div>

                        {/* Тип земли */}
                        <div className="space-y-2">
                            <Label htmlFor="landUse">Тип земли (фильтр)</Label>
                            <select
                                id="landUse"
                                value={formLandUseFilter}
                                onChange={(e) => setFormLandUseFilter(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">— Все типы —</option>
                                {landUseRefs.map((ref) => (
                                    <option key={ref.id} value={ref.code}>
                                        {ref.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* SEO-описание */}
                        <div className="space-y-2">
                            <Label htmlFor="description">SEO-описание</Label>
                            <Textarea
                                id="description"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Текст с ключевыми словами для SEO..."
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                Отображается под карточками для поисковых систем
                            </p>
                        </div>

                        {/* Порядок / Активность */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sortOrder">Порядок</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={formSortOrder}
                                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Статус</Label>
                                <Button
                                    type="button"
                                    variant={formIsActive ? "default" : "outline"}
                                    className="w-full"
                                    onClick={() => setFormIsActive(!formIsActive)}
                                >
                                    {formIsActive ? (
                                        <>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Активен
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            Скрыт
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                            >
                                Отмена
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {editingBlock ? "Сохранить" : "Создать"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
