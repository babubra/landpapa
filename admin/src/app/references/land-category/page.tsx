"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface ReferenceItem {
    id: number;
    type: string;
    code: string;
    name: string;
    description: string | null;
    sort_order: number;
}

interface FormData {
    code: string;
    name: string;
    description: string;
    sort_order: number;
}

const emptyForm: FormData = { code: "", name: "", description: "", sort_order: 0 };

export default function LandCategoryPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    // Состояние для диалога удаления
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
    const [deleteUsageCount, setDeleteUsageCount] = useState(0);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            fetchItems();
        }
    }, [token]);

    const fetchItems = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/references?type=land_category`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData(emptyForm);
        setDialogOpen(true);
    };

    const openEditDialog = (item: ReferenceItem) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            description: item.description || "",
            sort_order: item.sort_order,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingItem) {
                await fetch(`${API_URL}/api/admin/references/${editingItem.id}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                });
            } else {
                await fetch(`${API_URL}/api/admin/references`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ ...formData, type: "land_category" }),
                });
            }
            setDialogOpen(false);
            fetchItems();
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        }
    };

    const handleDeleteClick = async (id: number) => {
        try {
            const usageRes = await fetch(`${API_URL}/api/admin/references/${id}/usage`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!usageRes.ok) {
                alert("Ошибка проверки использования");
                return;
            }

            const usage = await usageRes.json();
            setDeleteItemId(id);
            setDeleteUsageCount(usage.plots_count);
            setDeleteDialogOpen(true);
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Ошибка проверки использования");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteItemId) return;

        try {
            const force = deleteUsageCount > 0;
            const deleteRes = await fetch(
                `${API_URL}/api/admin/references/${deleteItemId}?force=${force}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!deleteRes.ok) {
                const error = await deleteRes.json();
                alert(`Ошибка удаления: ${error.detail}`);
                return;
            }

            fetchItems();
        } catch (error) {
            console.error("Ошибка удаления:", error);
            alert("Ошибка удаления");
        } finally {
            setDeleteDialogOpen(false);
            setDeleteItemId(null);
            setDeleteUsageCount(0);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/references">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Категории земель</h1>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Список ({items.length})</CardTitle>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">Загрузка...</p>
                        ) : items.length === 0 ? (
                            <p className="text-muted-foreground">Элементы не найдены</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">ID</TableHead>
                                        <TableHead className="w-24">Код</TableHead>
                                        <TableHead>Название</TableHead>
                                        <TableHead>Описание</TableHead>
                                        <TableHead className="w-24">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono">{item.id}</TableCell>
                                            <TableCell className="font-mono">{item.code}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Диалог создания/редактирования */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Редактирование" : "Добавление"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Код</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="settlement"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Название</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Земли населённых пунктов"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Описание</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">Порядок сортировки</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSave}>
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить элемент?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteUsageCount > 0 ? (
                                <>
                                    Этот элемент используется в <strong>{deleteUsageCount}</strong> участках.
                                    <br /><br />
                                    При удалении связь с участками будет очищена (SET NULL).
                                </>
                            ) : (
                                "Это действие нельзя отменить."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
