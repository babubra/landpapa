"use client";

import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { MapPin } from "lucide-react";

export function AboutTextSection() {
    const { settings, isLoading } = useSiteSettings();

    // Если нет текста или загрузка — не показываем секцию
    if (isLoading || !settings?.seo_homepage_text) {
        return null;
    }

    return (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 md:p-6 h-full">
            <div
                className="[&_h2]:text-base [&_h2]:md:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-foreground
                           [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary [&_h3]:mt-3 [&_h3]:mb-1
                           [&_p]:text-xs [&_p]:md:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-2
                           [&_ul]:space-y-1 [&_ul]:my-2
                           [&_li]:text-xs [&_li]:md:text-sm [&_li]:text-muted-foreground
                           [&>*:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: settings.seo_homepage_text }}
            />
        </div>
    );
}
