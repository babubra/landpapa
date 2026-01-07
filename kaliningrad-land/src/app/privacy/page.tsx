import { getSiteSettings } from "@/lib/config";

export default async function PrivacyPage() {
    const settings = await getSiteSettings();
    const content = settings.privacy_policy;

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>

            {content ? (
                <div
                    className="prose prose-slate max-w-none space-y-6 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            ) : (
                <div className="bg-muted p-8 rounded-lg text-center text-muted-foreground">
                    Текст политики конфиденциальности еще не заполнен в настройках админ-панели.
                </div>
            )}

            <div className="mt-12 pt-6 border-t font-italic text-sm text-muted-foreground">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>
    );
}
