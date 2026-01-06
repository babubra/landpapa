"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    getRealtors,
    createRealtor,
    updateRealtor,
    deleteRealtor,
    RealtorItem,
    RealtorCreate,
    RealtorUpdate
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Users } from "lucide-react";

export default function RealtorsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Риэлторы
    const [realtors, setRealtors] = useState<RealtorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRealtor, setEditingRealtor] = useState<RealtorItem | null>(null);
    const [deleteRealtorId, setDeleteRealtorId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Форма
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        is_active: true,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            loadRealtors();
        }
    }, [user]);

    const loadRealtors = async () => {
        try {
            setLoading(true);
            const data = await getRealtors();
            setRealtors(data);
        } catch (error: any) {
            toast.error(error.message || "Ошибка загрузки риэлторов");
        } finally {
            setLoading(false);
        }
    };

    const openModal = (realtor?: RealtorItem) => {
        if (realtor) {
            setEditingRealtor(realtor);
            setForm({
                name: realtor.name,
                phone: realtor.phone,
                email: realtor.email || "",
                is_active: realtor.is_active ?? true,
            });
        } else {
            setEditingRealtor(null);
            setForm({
                name: "",
                phone: "",
                email: "",
                is_active: true,
            });
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Введите имя риэлтора");
            return;
        }
        if (!form.phone.trim()) {
            toast.error("Введите телефон риэлтора");
            return;
        }

        setSaving(true);
        try {
            if (editingRealtor) {
                const data: RealtorUpdate = {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim() || null,
                    is_active: form.is_active,
                };
                await updateRealtor(editingRealtor.id, data);
                toast.success("Риэлтор обновлён");
            } else {
                const data: RealtorCreate = {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim() || null,
                    is_active: form.is_active,
                };
                await createRealtor(data);
                toast.success("Риэлтор создан");
            }
            setModalOpen(false);
            loadRealtors();
        } catch (error: any) {
            toast.error(error.message || "Ошибка сохранения риэлтора");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRealtorId) return;

        setDeleting(true);
        try {
            await deleteRealtor(deleteRealtorId);
            toast.success("Риэлтор удалён");
            setDeleteRealtorId(null);
            loadRealtors();
        } catch (error: any) {
            toast.error(error.message || "Ошибка удаления риэлтора");
        } finally {
            setDeleting(false);
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
                            <Users className="h-6 w-6" />
                            <h1 className="text-xl font-bold">Риэлторы</h1>
                        </div>
                    </div>
                    <Button onClick={() => openModal()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                <p className="text-muted-foreground mb-6">
                    Контактные лица для объявлений. Телефон риэлтора отображается в карточке объявления.
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : realtors.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Нет риэлторов</p>
                        <Button onClick={() => openModal()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить первого
                        </Button>
                    </div>
                ) : (
                    <div className="bg-card rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Имя</TableHead>
                                    <TableHead>Телефон</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {realtors.map((realtor) => (
                                    <TableRow key={realtor.id}>
                                        <TableCell className="font-medium">{realtor.name}</TableCell>
                                        <TableCell>{realtor.phone}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {realtor.email || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${realtor.is_active
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                }`}>
                                                {realtor.is_active ? "Активен" : "Неактивен"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openModal(realtor)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteRealtorId(realtor.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </main>

            {/* Модальное окно */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingRealtor ? "Редактирование риэлтора" : "Новый риэлтор"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Имя *</Label>
                            <Input
                                id="name"
                                placeholder="Иванов Иван Иванович"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Телефон *</Label>
                            <Input
                                id="phone"
                                placeholder="+7 (999) 123-45-67"
                                value={form.phone}
                                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                value={form.email}
                                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Активен
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingRealtor ? "Сохранить" : "Создать"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления */}
            <AlertDialog open={!!deleteRealtorId} onOpenChange={(open) => !open && setDeleteRealtorId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить риэлтора?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие нельзя отменить. Риэлтор будет удалён, если у него нет привязанных объявлений.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
