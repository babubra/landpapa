/**
 * Типы для viewport-based загрузки участков на карте.
 */

export interface MapMarkerItem {
    type: "point" | "cluster";
    id: string;  // "123" для точки, "123,456,789" для кластера
    lat: number;
    lon: number;
    count: number;
    // Только для point:
    price?: number | null;
    listing_slug?: string | null;
    // Только для cluster:
    bounds?: [[number, number], [number, number]] | null;  // [[south, west], [north, east]]
}

export interface PlotViewportResponse {
    zoom: number;
    markers: MapMarkerItem[];
    total_in_viewport: number;
}

export interface ViewportBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}
