"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSiteSettings, SiteSettings, getImageUrl } from "@/lib/config";

interface SiteSettingsContextType {
    settings: SiteSettings | null;
    isLoading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
    settings: null,
    isLoading: true,
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getSiteSettings()
            .then(setSettings)
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <SiteSettingsContext.Provider value={{ settings, isLoading }}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

export function useSiteSettings() {
    return useContext(SiteSettingsContext);
}

/**
 * Получить URL placeholder-изображения из настроек.
 * Если в настройках пусто, возвращает /hero-bg.jpg
 */
export function usePlaceholderImage(): string {
    const { settings } = useSiteSettings();
    if (settings?.placeholder_image) {
        return getImageUrl(settings.placeholder_image, "/hero-bg.jpg");
    }
    return "/hero-bg.jpg";
}

