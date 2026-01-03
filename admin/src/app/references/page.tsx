"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReferencesPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Справочники в алфавитном порядке
    const references = [
        {
            title: "Виды разрешённого использования",
            description: "ИЖС, ЛПХ, СНТ и другие виды использования",
            href: "/references/land-use",
            editable: true,
        },
        {
            title: "Категории земель",
            description: "Земли населённых пунктов, с/х назначения и др.",
            href: "/references/land-category",
            editable: true,
        },
        {
            title: "Населённые пункты",
            description: "Города, посёлки и деревни",
            href: "/references/settlements",
            editable: false,
        },
        {
            title: "Районы",
            description: "Районы Калининградской области",
            href: "/references/districts",
            editable: false,
        },
    ];

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Справочники</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Выберите справочник</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {references.map((ref) => (
                                <Link key={ref.href} href={ref.href}>
                                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                                        <div>
                                            <h3 className="font-medium">{ref.title}</h3>
                                            <p className="text-sm text-muted-foreground">{ref.description}</p>
                                        </div>
                                        {!ref.editable && (
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                только чтение
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
