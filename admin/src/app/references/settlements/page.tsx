"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Settlement {
    id: number;
    name: string;
    slug: string;
    type: string | null;
    district_id: number;
    district_name: string;
    fias_id: string | null;
    sort_order: number;
}

export default function SettlementsPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            fetchSettlements();
        }
    }, [token]);

    const fetchSettlements = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/references/settlements`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSettlements(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки населённых пунктов:", error);
        } finally {
            setLoading(false);
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
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/references">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Населённые пункты</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Список населённых пунктов ({settlements.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">Загрузка...</p>
                        ) : settlements.length === 0 ? (
                            <p className="text-muted-foreground">Населённые пункты не найдены</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">ID</TableHead>
                                        <TableHead>Название</TableHead>
                                        <TableHead>Тип</TableHead>
                                        <TableHead>Район</TableHead>
                                        <TableHead>Slug</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settlements.map((settlement) => (
                                        <TableRow key={settlement.id}>
                                            <TableCell className="font-mono">{settlement.id}</TableCell>
                                            <TableCell className="font-medium">{settlement.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{settlement.type || "—"}</TableCell>
                                            <TableCell>{settlement.district_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{settlement.slug}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
