import { getSiteSettings } from "@/lib/config";

export async function GET() {
    try {
        const settings = await getSiteSettings();
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
