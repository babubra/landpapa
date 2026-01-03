"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Админ-панель</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={logout}>
              Выйти
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Добро пожаловать, {user.display_name || user.username}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Выберите раздел для управления контентом.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/listings">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1">📋 Объявления</h3>
                  <p className="text-sm text-muted-foreground">Управление объявлениями</p>
                </Card>
              </Link>

              <Link href="/plots">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1">🗺️ Участки</h3>
                  <p className="text-sm text-muted-foreground">Управление участками</p>
                </Card>
              </Link>

              <Card className="p-4 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-semibold mb-1">📰 Новости</h3>
                <p className="text-sm text-muted-foreground">Управление новостями</p>
              </Card>

              <Link href="/references">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1">📚 Справочники</h3>
                  <p className="text-sm text-muted-foreground">Районы, назначения</p>
                </Card>
              </Link>

              <Card className="p-4 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-semibold mb-1">👥 Риэлторы</h3>
                <p className="text-sm text-muted-foreground">Управление риэлторами</p>
              </Card>

              <Link href="/settings">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1">⚙️ Настройки</h3>
                  <p className="text-sm text-muted-foreground">Настройки сайта</p>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
