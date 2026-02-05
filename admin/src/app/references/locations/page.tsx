"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ChevronDown, Building2, MapPin, Home, Globe, Pencil, Check, X, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Типы
interface Location {
    id: number;
    name: string;
    slug: string;
    type: "region" | "city" | "district" | "settlement";
    settlement_type: string | null;
    parent_id: number | null;
    listings_count: number;
    sort_order: number;
    name_locative: string | null;  // SEO: "в Калининграде"
    description: string | null;  // SEO: описание локации
    children: Location[];
}

// Иконки для типов
function LocationIcon({ type }: { type: Location["type"] }) {
    switch (type) {
        case "region":
            return <Globe className="h-4 w-4 text-purple-500" />;
        case "city":
            return <Building2 className="h-4 w-4 text-blue-500" />;
        case "district":
            return <MapPin className="h-4 w-4 text-green-500" />;
        case "settlement":
            return <Home className="h-4 w-4 text-amber-500" />;
        default:
            return <MapPin className="h-4 w-4" />;
    }
}

// Бейдж для типа
function TypeBadge({ type }: { type: Location["type"] }) {
    const labels: Record<Location["type"], string> = {
        region: "Регион",
        city: "Город",
        district: "Район",
        settlement: "Нас. пункт",
    };
    const colors: Record<Location["type"], string> = {
        region: "bg-purple-100 text-purple-700",
        city: "bg-blue-100 text-blue-700",
        district: "bg-green-100 text-green-700",
        settlement: "bg-amber-100 text-amber-700",
    };
    return (
        <Badge variant="outline" className={cn("text-xs", colors[type])}>
            {labels[type]}
        </Badge>
    );
}

// Рекурсивный компонент для отображения узла
function LocationNode({
    node,
    level,
    expandedIds,
    onToggleExpand,
    onUpdateSortOrder,
    onUpdateLocative,
    onUpdateDescription,
    token,
}: {
    node: Location;
    level: number;
    expandedIds: Set<number>;
    onToggleExpand: (id: number) => void;
    onUpdateSortOrder: (id: number, sortOrder: number) => void;
    onUpdateLocative: (id: number, nameLocative: string | null) => void;
    onUpdateDescription: (id: number, description: string | null) => void;
    token: string | null;
}) {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingLocative, setIsEditingLocative] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [sortOrderValue, setSortOrderValue] = useState(node.sort_order?.toString() || "0");
    const [locativeValue, setLocativeValue] = useState(node.name_locative || "");
    const [descriptionValue, setDescriptionValue] = useState(node.description || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleSave = async () => {
        const newValue = parseInt(sortOrderValue, 10);
        if (isNaN(newValue)) return;

        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/locations/${node.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sort_order: newValue }),
            });
            if (res.ok) {
                onUpdateSortOrder(node.id, newValue);
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSortOrderValue(node.sort_order?.toString() || "0");
        setIsEditing(false);
    };

    const handleSaveLocative = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/locations/${node.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name_locative: locativeValue || null }),
            });
            if (res.ok) {
                onUpdateLocative(node.id, locativeValue || null);
                setIsEditingLocative(false);
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelLocative = () => {
        setLocativeValue(node.name_locative || "");
        setIsEditingLocative(false);
    };

    const handleSaveDescription = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/locations/${node.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ description: descriptionValue || null }),
            });
            if (res.ok) {
                onUpdateDescription(node.id, descriptionValue || null);
                setIsEditingDescription(false);
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelDescription = () => {
        setDescriptionValue(node.description || "");
        setIsEditingDescription(false);
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded cursor-pointer",
                    level > 0 && "ml-6 border-l"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Expand/Collapse */}
                <span
                    className="w-5 h-5 flex items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) onToggleExpand(node.id);
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : null}
                </span>

                {/* Icon */}
                <LocationIcon type={node.type} />

                {/* Name */}
                <span className="flex-1 font-medium">
                    {node.settlement_type ? `${node.settlement_type}. ` : ""}
                    {node.name}
                </span>

                {/* Type Badge */}
                <TypeBadge type={node.type} />

                {/* Sort Order Editor */}
                {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                            type="number"
                            value={sortOrderValue}
                            onChange={(e) => setSortOrderValue(e.target.value)}
                            className="w-20 h-7 text-sm"
                            disabled={isSaving}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave();
                                if (e.key === "Escape") handleCancel();
                            }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel} disabled={isSaving}>
                            <X className="h-3 w-3 text-red-600" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded min-w-[40px] text-center">
                            {node.sort_order || 0}
                        </span>
                        {isHovered && (node.type === "city" || node.type === "district") && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}

                {/* Listings Count */}
                <span className="text-sm text-muted-foreground">
                    {node.listings_count} объявл.
                </span>

                {/* Slug */}
                <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {node.slug}
                </code>

                {/* Name Locative (SEO) */}
                {isEditingLocative ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                            type="text"
                            value={locativeValue}
                            onChange={(e) => setLocativeValue(e.target.value)}
                            placeholder="в Калининграде"
                            className="w-40 h-7 text-sm"
                            disabled={isSaving}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveLocative();
                                if (e.key === "Escape") handleCancelLocative();
                            }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveLocative} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelLocative} disabled={isSaving}>
                            <X className="h-3 w-3 text-red-600" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {node.name_locative ? (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                {node.name_locative}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">
                                нет SEO
                            </span>
                        )}
                        {node.description && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                описание ✓
                            </span>
                        )}
                        {isHovered && (node.type === "city" || node.type === "district" || node.type === "settlement") && (
                            <>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setIsEditingLocative(true)}
                                    title="Редактировать SEO склонение"
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={cn("h-6 w-6", node.description && "text-blue-500")}
                                    onClick={() => setIsEditingDescription(true)}
                                    title="Редактировать описание"
                                >
                                    <FileText className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Редактирование описания — expandable секция */}
            {isEditingDescription && (
                <div
                    className={cn("ml-6 mt-2 p-3 bg-muted/30 rounded-lg border", level > 0 && "ml-12")}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs text-muted-foreground mb-2">
                        SEO-описание (отображается на geo-странице под H1)
                    </div>
                    <Textarea
                        value={descriptionValue}
                        onChange={(e) => setDescriptionValue(e.target.value)}
                        placeholder="Описание локации для SEO..."
                        className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2 mt-2">
                        <Button
                            size="sm"
                            onClick={handleSaveDescription}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Check className="h-3 w-3 mr-1" />
                            )}
                            Сохранить
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelDescription}
                            disabled={isSaving}
                        >
                            <X className="h-3 w-3 mr-1" />
                            Отмена
                        </Button>
                    </div>
                </div>
            )}

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {node.children.map((child) => (
                        <LocationNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onUpdateSortOrder={onUpdateSortOrder}
                            onUpdateLocative={onUpdateLocative}
                            onUpdateDescription={onUpdateDescription}
                            token={token}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function LocationsPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [hierarchy, setHierarchy] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            fetchHierarchy();
        }
    }, [token]);

    const fetchHierarchy = async () => {
        try {
            const res = await fetch(`${API_URL}/api/locations/hierarchy/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHierarchy(data);

                // Раскрываем первый уровень по умолчанию
                const firstLevel = new Set<number>();
                data.forEach((region: Location) => {
                    firstLevel.add(region.id);
                    region.children.forEach((child: Location) => {
                        if (child.type === "city" || child.type === "district") {
                            firstLevel.add(child.id);
                        }
                    });
                });
                setExpandedIds(firstLevel);
            }
        } catch (error) {
            console.error("Ошибка загрузки иерархии:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Callback для обновления sort_order в локальном state
    const updateSortOrder = useCallback((id: number, newSortOrder: number) => {
        const updateRecursive = (nodes: Location[]): Location[] => {
            return nodes.map(node => {
                if (node.id === id) {
                    return { ...node, sort_order: newSortOrder };
                }
                if (node.children.length > 0) {
                    return { ...node, children: updateRecursive(node.children) };
                }
                return node;
            });
        };
        setHierarchy(updateRecursive);
    }, []);

    // Callback для обновления name_locative в локальном state
    const updateLocative = useCallback((id: number, newLocative: string | null) => {
        const updateRecursive = (nodes: Location[]): Location[] => {
            return nodes.map(node => {
                if (node.id === id) {
                    return { ...node, name_locative: newLocative };
                }
                if (node.children.length > 0) {
                    return { ...node, children: updateRecursive(node.children) };
                }
                return node;
            });
        };
        setHierarchy(updateRecursive);
    }, []);

    // Callback для обновления description в локальном state
    const updateDescription = useCallback((id: number, newDescription: string | null) => {
        const updateRecursive = (nodes: Location[]): Location[] => {
            return nodes.map(node => {
                if (node.id === id) {
                    return { ...node, description: newDescription };
                }
                if (node.children.length > 0) {
                    return { ...node, children: updateRecursive(node.children) };
                }
                return node;
            });
        };
        setHierarchy(updateRecursive);
    }, []);

    // Статистика
    const stats = useMemo(() => {
        let regions = 0, cities = 0, districts = 0, settlements = 0;
        const countNodes = (nodes: Location[]) => {
            for (const node of nodes) {
                if (node.type === "region") regions++;
                else if (node.type === "city") cities++;
                else if (node.type === "district") districts++;
                else if (node.type === "settlement") settlements++;
                countNodes(node.children);
            }
        };
        countNodes(hierarchy);
        return { regions, cities, districts, settlements, total: regions + cities + districts + settlements };
    }, [hierarchy]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/references">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Локации</h1>
                        <p className="text-muted-foreground">Иерархическая структура географических объектов</p>
                    </div>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Всего</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.regions}</div>
                            <div className="text-sm text-muted-foreground">Регионов</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.cities}</div>
                            <div className="text-sm text-muted-foreground">Городов</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.districts}</div>
                            <div className="text-sm text-muted-foreground">Районов</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.settlements}</div>
                            <div className="text-sm text-muted-foreground">Нас. пунктов</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Иерархия локаций</CardTitle>
                        <CardDescription>Регион → Районы/Города → Населённые пункты</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">Загрузка...</p>
                        ) : hierarchy.length === 0 ? (
                            <p className="text-muted-foreground">Локации не найдены</p>
                        ) : (
                            <div className="space-y-1">
                                {hierarchy.map((node) => (
                                    <LocationNode
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onUpdateSortOrder={updateSortOrder}
                                        onUpdateLocative={updateLocative}
                                        onUpdateDescription={updateDescription}
                                        token={token}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
