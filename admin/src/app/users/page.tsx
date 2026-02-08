"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    changeAdminUserPassword,
    deleteAdminUser,
    AdminUser,
    AdminUserCreate,
    AdminUserUpdate
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
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Users, Key } from "lucide-react";

export default function UsersPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Пользователи
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Форма создания/редактирования
    const [form, setForm] = useState({
        username: "",
        password: "",
        email: "",
        display_name: "",
        telegram_id: "",
        is_active: true,
    });

    // Форма смены пароля
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push("/login");
        }
    }, [currentUser, authLoading, router]);

    useEffect(() => {
        if (currentUser) {
            loadUsers();
        }
    }, [currentUser]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getAdminUsers();
            setUsers(data.items);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Ошибка загрузки пользователей";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (user?: AdminUser) => {
        if (user) {
            setEditingUser(user);
            setForm({
                username: user.username,
                password: "",
                email: user.email || "",
                display_name: user.display_name || "",
                telegram_id: user.telegram_id?.toString() || "",
                is_active: user.is_active,
            });
        } else {
            setEditingUser(null);
            setForm({
                username: "",
                password: "",
                email: "",
                display_name: "",
                telegram_id: "",
                is_active: true,
            });
        }
        setModalOpen(true);
    };

    const openPasswordModal = (userId: number) => {
        setPasswordUserId(userId);
        setNewPassword("");
        setPasswordModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.username.trim()) {
            toast.error("Введите логин");
            return;
        }
        if (!editingUser && !form.password.trim()) {
            toast.error("Введите пароль");
            return;
        }

        setSaving(true);
        try {
            if (editingUser) {
                const data: AdminUserUpdate = {
                    username: form.username.trim(),
                    email: form.email.trim() || null,
                    display_name: form.display_name.trim() || null,
                    telegram_id: form.telegram_id ? parseInt(form.telegram_id, 10) : null,
                    is_active: form.is_active,
                };
                await updateAdminUser(editingUser.id, data);
                toast.success("Пользователь обновлён");
            } else {
                const data: AdminUserCreate = {
                    username: form.username.trim(),
                    password: form.password,
                    email: form.email.trim() || undefined,
                    display_name: form.display_name.trim() || undefined,
                    telegram_id: form.telegram_id ? parseInt(form.telegram_id, 10) : undefined,
                    is_active: form.is_active,
                };
                await createAdminUser(data);
                toast.success("Пользователь создан");
            }
            setModalOpen(false);
            loadUsers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Ошибка сохранения";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordUserId || !newPassword.trim()) {
            toast.error("Введите новый пароль");
            return;
        }

        setSaving(true);
        try {
            await changeAdminUserPassword(passwordUserId, newPassword);
            toast.success("Пароль изменён");
            setPasswordModalOpen(false);
            setPasswordUserId(null);
            setNewPassword("");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Ошибка смены пароля";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUserId) return;

        setDeleting(true);
        try {
            await deleteAdminUser(deleteUserId);
            toast.success("Пользователь удалён");
            setDeleteUserId(null);
            loadUsers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Ошибка удаления";
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    if (authLoading || !currentUser) {
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
                            <h1 className="text-xl font-bold">Пользователи</h1>
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
                    Управление доступом к админ-панели. Пользователи могут входить через Telegram или логин/пароль.
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Нет пользователей</p>
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
                                    <TableHead>Логин</TableHead>
                                    <TableHead>Имя</TableHead>
                                    <TableHead>Telegram ID</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Последний вход</TableHead>
                                    <TableHead className="w-[130px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.username}
                                            {currentUser.id === user.id && (
                                                <span className="ml-2 text-xs text-blue-600">(вы)</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.display_name || "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-sm">
                                            {user.telegram_id || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${user.is_active
                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                }`}>
                                                {user.is_active ? "Активен" : "Неактивен"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {user.last_login
                                                ? new Date(user.last_login).toLocaleString("ru")
                                                : "Не входил"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openPasswordModal(user.id)}
                                                    title="Сменить пароль"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openModal(user)}
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteUserId(user.id)}
                                                    disabled={currentUser.id === user.id}
                                                    title={currentUser.id === user.id ? "Нельзя удалить себя" : "Удалить"}
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

            {/* Модальное окно создания/редактирования */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingUser ? "Редактирование пользователя" : "Новый пользователь"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Логин *</Label>
                            <Input
                                id="username"
                                placeholder="admin"
                                value={form.username}
                                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                            />
                        </div>
                        {!editingUser && (
                            <div className="space-y-2">
                                <Label htmlFor="password">Пароль *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="display_name">Отображаемое имя</Label>
                            <Input
                                id="display_name"
                                placeholder="Иван Иванов"
                                value={form.display_name}
                                onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
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
                        <div className="space-y-2">
                            <Label htmlFor="telegram_id">Telegram ID</Label>
                            <Input
                                id="telegram_id"
                                type="text"
                                placeholder="123456789"
                                value={form.telegram_id}
                                onChange={(e) => setForm(prev => ({ ...prev, telegram_id: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Для входа через Telegram. Узнать ID можно через @userinfobot
                            </p>
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
                            {editingUser ? "Сохранить" : "Создать"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Модальное окно смены пароля */}
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Смена пароля</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new_password">Новый пароль</Label>
                            <Input
                                id="new_password"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleChangePassword} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Сменить пароль
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления */}
            <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие нельзя отменить. Пользователь потеряет доступ к админ-панели.
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
