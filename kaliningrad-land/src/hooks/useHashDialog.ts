"use client";

import { useCallback, useEffect, useState } from "react";
import { trackHashPageview } from "@/lib/landing";

interface UseHashDialogOptions {
    /** Заголовок «страницы» для отчётов Метрики. */
    title: string;
    /** Другие хеши того же окна — например, экран «Заявка принята». */
    extraHashes?: string[];
}

/**
 * Привязывает состояние модального окна к хешу в адресной строке.
 *
 * За счёт этого модалка ведёт себя как отдельная страница: по ссылке вида
 * /#podbor-uchastka она открывается сразу (можно вести рекламу), работает кнопка
 * «Назад», а открытие уходит в Метрику отдельным просмотром.
 *
 * Просмотр отправляется только при открытии по кнопке: если пользователь пришёл
 * по прямой ссылке с хешем, этот адрес уже засчитан обычным хитом счётчика.
 */
export function useHashDialog(hash: string, { title, extraHashes = [] }: UseHashDialogOptions) {
    const [open, setOpen] = useState(false);
    // Строкой, чтобы массив не пересоздавал эффект на каждый рендер
    const ownedHashes = [hash, ...extraHashes].join(",");

    useEffect(() => {
        const owned = ownedHashes.split(",");
        const sync = () => setOpen(owned.includes(window.location.hash));

        // Открываем сразу, если страницу открыли по ссылке с хешем
        sync();

        window.addEventListener("hashchange", sync);
        window.addEventListener("popstate", sync);

        return () => {
            window.removeEventListener("hashchange", sync);
            window.removeEventListener("popstate", sync);
        };
    }, [ownedHashes]);

    const changeOpen = useCallback((next: boolean) => {
        const owned = ownedHashes.split(",");
        const currentHash = window.location.hash;

        if (next) {
            if (!owned.includes(currentHash)) {
                // pushState, а не location.hash — чтобы страница не прыгала к якорю
                window.history.pushState(null, "", hash);
                trackHashPageview(hash, title);
            }
        } else if (owned.includes(currentHash)) {
            window.history.pushState(null, "", window.location.pathname + window.location.search);
        }

        setOpen(next);
    }, [hash, ownedHashes, title]);

    return [open, changeOpen] as const;
}
