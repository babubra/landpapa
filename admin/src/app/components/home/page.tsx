"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Home, LayoutGrid } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function HomeComponentsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/components")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Home className="h-6 w-6" />
                        <h1 className="text-xl font-bold">Главная страница</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <p className="text-muted-foreground mb-6">
                    Настройка компонентов главной страницы.
                </p>

                <div className="max-w-2xl grid gap-4">
                    <Link href="/components/home/seo-blocks">
                        <Card className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <LayoutGrid className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <h2 className="text-lg font-semibold">SEO-блоки</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Динамические блоки с объявлениями по районам и категориям
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>
            </main>
        </div>
    );
}
