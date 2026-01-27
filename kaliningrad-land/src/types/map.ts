/**
 * Типы для загрузки участков на карте.
 */

export interface PlotPoint {
    id: number;
    lat: number;
    lon: number;
    price: number | null;
    listing_slug: string;
    title: string;  // Название объявления для popup
    settlement_slug?: string;
    district_slug?: string;
}

export interface PlotAllResponse {
    plots: PlotPoint[];
    total: number;
}

// Дефолтные значения для карты (Калининград)
export const DEFAULT_MAP_CENTER: [number, number] = [54.7104, 20.4522];
export const DEFAULT_MAP_ZOOM = 9;
