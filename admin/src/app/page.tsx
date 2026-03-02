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
              <Link href="/leads">
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer ring-2 ring-blue-500/50">
                  <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-400">📞 Заявки</h3>
                  <p className="text-sm text-muted-foreground">Обратные звонки и лиды</p>
                </Card>
              </Link>

              <Link href="/listings">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">📋 Объявления</h3>
                  <p className="text-sm text-muted-foreground">Управление объявлениями</p>
                </Card>
              </Link>

              <Link href="/plots">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">🗺️ Участки</h3>
                  <p className="text-sm text-muted-foreground">Управление участками</p>
                </Card>
              </Link>

              <Card className="p-4 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">📰 Новости</h3>
                <p className="text-sm text-muted-foreground">Управление новостями</p>
              </Card>

              <Link href="/references">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">📚 Справочники</h3>
                  <p className="text-sm text-muted-foreground">Районы, назначения</p>
                </Card>
              </Link>

              <Link href="/realtors">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">👥 Риэлторы</h3>
                  <p className="text-sm text-muted-foreground">Управление риэлторами</p>
                </Card>
              </Link>

              <Link href="/pages">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">📄 Страницы сайта</h3>
                  <p className="text-sm text-muted-foreground">О нас, политика конф.</p>
                </Card>
              </Link>

              <Link href="/seo">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20">
                  <h3 className="font-semibold mb-1 text-indigo-700 dark:text-indigo-400">🔍 SEO</h3>
                  <p className="text-sm text-muted-foreground">Мета-теги, соцсети</p>
                </Card>
              </Link>

              <Link href="/settings">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-1 text-slate-900 dark:text-slate-100">⚙️ Настройки</h3>
                  <p className="text-sm text-muted-foreground">Настройки сайта</p>
                </Card>
              </Link>

              <Link href="/users">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border-orange-200 dark:border-orange-800 ring-1 ring-orange-500/20">
                  <h3 className="font-semibold mb-1 text-orange-700 dark:text-orange-400">🔐 Пользователи</h3>
                  <p className="text-sm text-muted-foreground">Доступ к админке</p>
                </Card>
              </Link>

              <Link href="/components">
                <Card className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500/20">
                  <h3 className="font-semibold mb-1 text-emerald-700 dark:text-emerald-400">🧩 Настройка компонентов</h3>
                  <p className="text-sm text-muted-foreground">Блоки на страницах</p>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
