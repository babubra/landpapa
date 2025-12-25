import { Suspense } from "react";
import { CatalogContent } from "./CatalogContent";

export const metadata = {
    title: "Каталог земельных участков — КалининградЗем",
    description: "Все земельные участки в Калининградской области. Фильтрация по районам, цене и площади.",
};

export default function CatalogPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Каталог земельных участков</h1>

                <Suspense fallback={<div>Загрузка...</div>}>
                    <CatalogContent />
                </Suspense>
            </div>
        </div>
    );
}
