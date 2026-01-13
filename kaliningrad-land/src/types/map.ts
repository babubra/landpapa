/**
 * Типы для viewport-based загрузки участков на карте.
 */

export interface PlotViewportItem {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
    status: "active" | "sold" | "reserved";
    polygon_coords: [number, number][];  // [[lat, lon], ...]
    listing_id: number | null;
    listing_slug: string | null;
}

export interface ClusterItem {
    center: [number, number];  // [lat, lon]
    count: number;
    bounds: [[number, number], [number, number]];  // [[south, west], [north, east]]
    price_range: [number, number] | null;
}

export interface PlotViewportResponse {
    zoom: number;
    plots: PlotViewportItem[];
    clusters: ClusterItem[];
    total_in_viewport: number;
}

export interface ViewportBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}
