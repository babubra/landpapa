"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface User {
    id: number;
    username: string;
    display_name: string | null;
}

// Данные от Telegram Login Widget
export interface TelegramAuthData {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    loginWithTelegram: (data: TelegramAuthData) => Promise<void>;
    loginDev: (telegramId: number) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL } from "@/lib/api";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Проверка токена при загрузке
    useEffect(() => {
        const savedToken = localStorage.getItem("admin_token");
        if (savedToken) {
            setToken(savedToken);
            fetchUser(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUser = async (accessToken: string) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                localStorage.removeItem("admin_token");
                setToken(null);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthSuccess = async (accessToken: string) => {
        localStorage.setItem("admin_token", accessToken);
        setToken(accessToken);
        await fetchUser(accessToken);
        router.push("/");
    };

    const login = async (username: string, password: string) => {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Ошибка авторизации");
        }

        const data = await res.json();
        await handleAuthSuccess(data.access_token);
    };

    const loginWithTelegram = async (authData: TelegramAuthData) => {
        const res = await fetch(`${API_URL}/api/auth/telegram`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(authData),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Ошибка авторизации через Telegram");
        }

        const data = await res.json();
        await handleAuthSuccess(data.access_token);
    };

    const loginDev = async (telegramId: number) => {
        const res = await fetch(`${API_URL}/api/auth/telegram-dev?telegram_id=${telegramId}`, {
            method: "POST",
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Ошибка dev авторизации");
        }

        const data = await res.json();
        await handleAuthSuccess(data.access_token);
    };

    const logout = () => {
        localStorage.removeItem("admin_token");
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, loginWithTelegram, loginDev, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
