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

interface District {
    id: number;
    name: string;
    slug: string;
    fias_id: string | null;
    sort_order: number;
    settlements_count: number;
}

export default function DistrictsPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [districts, setDistricts] = useState<District[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            fetchDistricts();
        }
    }, [token]);

    const fetchDistricts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/references/districts`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDistricts(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки районов:", error);
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
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/references">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Районы</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Список районов</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">Загрузка...</p>
                        ) : districts.length === 0 ? (
                            <p className="text-muted-foreground">Районы не найдены</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">ID</TableHead>
                                        <TableHead>Название</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-right">Населённых пунктов</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {districts.map((district) => (
                                        <TableRow key={district.id}>
                                            <TableCell className="font-mono">{district.id}</TableCell>
                                            <TableCell className="font-medium">{district.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{district.slug}</TableCell>
                                            <TableCell className="text-right">{district.settlements_count}</TableCell>
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
