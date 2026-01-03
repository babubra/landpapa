import { Suspense } from "react";
import { MapPageContent } from "./MapPageContent";

export const metadata = {
    title: "Карта участков — КалининградЗем",
    description: "Интерактивная карта земельных участков в Калининградской области.",
};

export default function MapPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="h-screen flex items-center justify-center">Загрузка...</div>}>
                <MapPageContent />
            </Suspense>
        </div>
    );
}
