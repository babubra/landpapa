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

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IS_SERVER = typeof window === "undefined";
const API_URL = IS_SERVER ? (process.env.NEXT_PUBLIC_API_URL || "http://backend:8000") : "";

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
        const accessToken = data.access_token;

        localStorage.setItem("admin_token", accessToken);
        setToken(accessToken);
        await fetchUser(accessToken);
        router.push("/");
    };

    const logout = () => {
        localStorage.removeItem("admin_token");
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
