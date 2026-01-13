/**
 * Хук для управления viewport-based загрузкой участков на карте.
 * 
 * Автоматически загружает участки или кластеры в зависимости от уровня зума.
 */

import { useState, useCallback, useRef } from 'react';
import type { LatLngBounds } from 'leaflet';

export interface PlotViewportItem {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;
    status: 'active' | 'sold' | 'reserved';
    polygon_coords: [number, number][];
    listing_id: number | null;
}

export interface ClusterItem {
    center: [number, number];
    count: number;
    bounds: [[number, number], [number, number]];
    price_range: [number, number] | null;
}

export interface PlotViewportResponse {
    zoom: number;
    plots: PlotViewportItem[];
    clusters: ClusterItem[];
    total_in_viewport: number;
}

export interface FilterParams {
    district_id?: number;
    settlements?: string;
    land_use_id?: number;
    price_min?: number;
    price_max?: number;
    area_min?: number;
    area_max?: number;
}

export function usePlotsViewport(filters: FilterParams = {}) {
    const [plots, setPlots] = useState<PlotViewportItem[]>([]);
    const [clusters, setClusters] = useState<ClusterItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentZoom, setCurrentZoom] = useState(10);

    // Для debounce загрузки
    const loadTimeoutRef = useRef<NodeJS.Timeout>();
    const abortControllerRef = useRef<AbortController>();

    const loadData = useCallback(async (bounds: LatLngBounds, zoom: number) => {
        // Отменяем предыдущий запрос если он еще выполняется
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Очищаем предыдущий таймер debounce
        if (loadTimeoutRef.current !== undefined) {
            clearTimeout(loadTimeoutRef.current);
        }

        // Debounce 300ms для избежания частых запросов при перемещении карты
        loadTimeoutRef.current = setTimeout(async () => {
            setLoading(true);

            const params = new URLSearchParams({
                north: bounds.getNorth().toString(),
                south: bounds.getSouth().toString(),
                east: bounds.getEast().toString(),
                west: bounds.getWest().toString(),
                zoom: zoom.toString(),
            });

            // Добавляем фильтры
            if (filters.district_id) params.set('district_id', filters.district_id.toString());
            if (filters.settlements) params.set('settlements', filters.settlements);
            if (filters.land_use_id) params.set('land_use_id', filters.land_use_id.toString());
            if (filters.price_min) params.set('price_min', filters.price_min.toString());
            if (filters.price_max) params.set('price_max', filters.price_max.toString());
            if (filters.area_min) params.set('area_min', filters.area_min.toString());
            if (filters.area_max) params.set('area_max', filters.area_max.toString());

            try {
                abortControllerRef.current = new AbortController();

                const response = await fetch(`/api/plots/viewport?${params.toString()}`, {
                    signal: abortControllerRef.current.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch plots');
                }

                const data: PlotViewportResponse = await response.json();

                setCurrentZoom(data.zoom);
                setTotal(data.total_in_viewport);

                if (data.zoom < 13) {
                    // Режим кластеров
                    setClusters(data.clusters);
                    setPlots([]);
                } else {
                    // Режим полигонов
                    setPlots(data.plots);
                    setClusters([]);
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    // Запрос был отменен, игнорируем
                    return;
                }
                console.error('Error loading plots:', error);
                setPlots([]);
                setClusters([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, [filters]);

    return {
        plots,
        clusters,
        loading,
        total,
        currentZoom,
        loadData,
    };
}
