import { getSiteSettings } from "@/lib/config";

export default async function AboutPage() {
    const settings = await getSiteSettings();
    const content = settings.about_page;

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">О нас</h1>

            {content ? (
                <div
                    className="prose prose-slate max-w-none space-y-6 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            ) : (
                <div className="bg-muted p-8 rounded-lg text-center text-muted-foreground">
                    Информация о компании еще не заполнена в админ-панели.
                </div>
            )}
        </div>
    );
}
