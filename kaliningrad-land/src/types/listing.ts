/**
 * Общие типы для объявлений.
 */

export interface ImageData {
    id?: number;
    url: string;
    thumbnail_url: string | null;
}

export interface Settlement {
    id: number;
    name: string;
    slug: string;
    type?: string | null; // "г", "пос", "с" и т.д.
    district?: {
        id: number;
        name: string;
        slug: string;
    };
}

export interface Realtor {
    id: number;
    name: string;
    phone: string;
    company: string | null;
}

export interface Location {
    id: number;
    name: string;
    slug: string;
    type: string;
    parent_id?: number | null;
    settlement_type?: string | null;
    name_locative?: string | null;  // Склонение для SEO ("в Калининграде")
    parent?: Location | null;
}

export interface ListingData {
    id: number;
    slug: string;
    title: string | null;  // Если заполнен — используется как H1, иначе генерируется по шаблону
    description?: string | null;
    price_min: number | null;
    price_max: number | null;
    total_area: number | null;
    area_min?: number | null;
    area_max?: number | null;
    plots_count: number;
    is_featured?: boolean;
    realtor: Realtor;
    settlement?: Settlement | null;
    location?: Location | null;
    // Участки (для SEO шаблонов)
    plots?: {
        cadastral_number?: string | null;
        land_use?: { name: string } | null;
    }[] | null;
    land_use_name?: string | null;  // Назначение (ИЖС, ЛПХ) — из первого участка
    // Поддержка обоих имён поля изображения
    image?: ImageData | null;
    main_image?: ImageData | null;
    coordinates?: number[][];
    // Мета-данные
    meta_title?: string | null;
    meta_description?: string | null;
}

export interface ListingsResponse {
    items: ListingData[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

