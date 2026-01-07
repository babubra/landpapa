"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Calendar, Globe, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { useAuth } from "@/lib/auth";
import { getLeads, updateLeadStatus, LeadItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function LeadsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [leads, setLeads] = useState<LeadItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

    // Проверка авторизации
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const loadLeads = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await getLeads(page, 20, statusFilter);
            setLeads(response.items);
            setTotal(response.total);
        } catch (error) {
            toast.error("Ошибка загрузки заявок");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, page, statusFilter]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const handleStatusChange = async (leadId: number, newStatus: string) => {
        try {
            await updateLeadStatus(leadId, newStatus);
            toast.success("Статус обновлен");
            loadLeads();
        } catch (error) {
            toast.error("Ошибка обновления статуса");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "new":
                return <Badge className="bg-blue-500">Новый</Badge>;
            case "processing":
                return <Badge className="bg-yellow-500">В работе</Badge>;
            case "completed":
                return <Badge className="bg-green-500">Завершен</Badge>;
            case "rejected":
                return <Badge variant="destructive">Отклонен</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (authLoading) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Заявки</h1>
                            <p className="text-muted-foreground">
                                Управление обращениями пользователей ({total})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Фильтр по статусу" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                <SelectItem value="new">Новые</SelectItem>
                                <SelectItem value="processing">В работе</SelectItem>
                                <SelectItem value="completed">Завершенные</SelectItem>
                                <SelectItem value="rejected">Отклоненные</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* List of Leads */}
                <div className="grid gap-4">
                    {isLoading ? (
                        <p className="text-center py-10 text-muted-foreground">Загрузка...</p>
                    ) : leads.length === 0 ? (
                        <Card className="p-10 text-center">
                            <p className="text-muted-foreground">Заявок пока нет</p>
                        </Card>
                    ) : (
                        leads.map((lead) => (
                            <Card key={lead.id} className={lead.status === 'new' ? 'border-l-4 border-l-blue-500 shadow-md transition-all hover:shadow-lg' : 'opacity-80'}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        {/* Информация о клиенте */}
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-4 mb-1">
                                                <div className="flex items-center gap-2 text-lg font-bold">
                                                    <User className="h-5 w-5 text-primary" />
                                                    {lead.name || "Аноним"}
                                                </div>
                                                {getStatusBadge(lead.status)}
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <a href={`tel:${lead.phone}`} className="hover:text-primary font-medium">
                                                        {lead.phone}
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(lead.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                    <Globe className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate max-w-sm" title={lead.source_url || ""}>
                                                        {lead.source_url || "Прямой переход"}
                                                    </span>
                                                </div>
                                            </div>

                                            {lead.comment && (
                                                <div className="mt-3 p-3 bg-muted/50 rounded-md flex gap-2">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                                                    <p className="text-sm italic">{lead.comment}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Действия */}
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <Label className="text-xs uppercase text-muted-foreground mb-1">Изменить статус</Label>
                                            <Select
                                                defaultValue={lead.status}
                                                onValueChange={(val) => handleStatusChange(lead.id, val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new">Новый</SelectItem>
                                                    <SelectItem value="processing">В работе</SelectItem>
                                                    <SelectItem value="completed">Завершен</SelectItem>
                                                    <SelectItem value="rejected">Отклонен</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="sm" className="mt-auto" asChild>
                                                <a href={`tel:${lead.phone}`}>Позвонить</a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination placeholder */}
                {total > 20 && (
                    <div className="flex justify-center gap-2 pt-4">
                        <Button
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            Назад
                        </Button>
                        <Button
                            variant="outline"
                            disabled={leads.length < 20}
                            onClick={() => setPage(page + 1)}
                        >
                            Вперед
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
