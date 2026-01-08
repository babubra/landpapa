import { API_URL, SettingItem } from "@/lib/api";

export async function GET() {
    try {
        // В админке получаем настройки через публичный эндпоинт так же как на фронте
        const res = await fetch(`${API_URL}/api/settings/public`, {
            cache: "no-store",
        });

        if (!res.ok) {
            return new Response(null, { status: 404 });
        }

        const settings = await res.json();
        const svg = settings.site_logo;

        if (!svg || !svg.trim().startsWith("<svg")) {
            return new Response(null, { status: 404 });
        }

        return new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
        });
    } catch (error) {
        console.error("Error serving site icon:", error);
        return new Response(null, { status: 500 });
    }
}
