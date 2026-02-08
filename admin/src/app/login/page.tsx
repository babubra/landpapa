"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, TelegramAuthData } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Определяем, находимся ли мы в dev-режиме
const isDev = process.env.NODE_ENV === "development";

// Declare Telegram Login callback for TypeScript
declare global {
    interface Window {
        onTelegramAuth: (user: TelegramAuthData) => void;
    }
}

export default function LoginPage() {
    const { login, loginWithTelegram, loginDev } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [devTelegramId, setDevTelegramId] = useState("");
    const [telegramBotName, setTelegramBotName] = useState<string | null>(null);

    // Загружаем имя бота из API
    useEffect(() => {
        const fetchBotName = async () => {
            try {
                const res = await fetch(`${API_URL}/api/settings/telegram_bot_name`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.value) {
                        setTelegramBotName(data.value);
                    }
                }
            } catch (e) {
                console.error("Ошибка загрузки имени бота:", e);
            }
        };
        fetchBotName();
    }, []);

    // Telegram callback handler
    const handleTelegramAuth = useCallback(async (telegramUser: TelegramAuthData) => {
        setError("");
        setIsLoading(true);
        try {
            await loginWithTelegram(telegramUser);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка авторизации через Telegram");
        } finally {
            setIsLoading(false);
        }
    }, [loginWithTelegram]);

    // Инициализация Telegram Login Widget
    useEffect(() => {
        // Устанавливаем глобальный callback
        window.onTelegramAuth = handleTelegramAuth;

        // Добавляем скрипт Telegram только если есть имя бота
        if (telegramBotName) {
            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", telegramBotName);
            script.setAttribute("data-size", "large");
            script.setAttribute("data-radius", "8");
            script.setAttribute("data-onauth", "onTelegramAuth(user)");
            script.setAttribute("data-request-access", "write");
            script.async = true;

            const container = document.getElementById("telegram-login-container");
            if (container) {
                container.innerHTML = "";
                container.appendChild(script);
            }
        }

        return () => {
            window.onTelegramAuth = undefined as unknown as typeof window.onTelegramAuth;
        };
    }, [handleTelegramAuth, telegramBotName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(username, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка авторизации");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDevLogin = async () => {
        if (!devTelegramId) {
            setError("Введите Telegram ID");
            return;
        }
        setError("");
        setIsLoading(true);

        try {
            await loginDev(parseInt(devTelegramId, 10));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка dev авторизации");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Вход в админ-панель</CardTitle>
                    <CardDescription>КалининградЗем</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Telegram Login Widget */}
                    {telegramBotName && (
                        <>
                            <div className="flex flex-col items-center">
                                <div id="telegram-login-container" className="min-h-[48px]" />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500">или</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Dev Login (только в development) */}
                    {isDev && (
                        <div className="p-4 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                            <p className="text-xs text-orange-600 dark:text-orange-400 mb-2 font-medium">
                                🔧 Dev Mode: Вход по Telegram ID
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={devTelegramId}
                                    onChange={(e) => setDevTelegramId(e.target.value)}
                                    placeholder="Telegram ID"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleDevLogin}
                                    disabled={isLoading}
                                >
                                    Войти
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Форма логин/пароль */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Логин</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Забыли пароль?
                            </Link>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Вход..." : "Войти"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
