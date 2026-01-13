"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { PlotMapItem, PlotClusterItem, ViewportParams } from "@/lib/api";

interface AdminPlotsMapProps {
    plots: PlotMapItem[];
    clusters: PlotClusterItem[];
    mode: "plots" | "clusters";
    selectedIds: Set<number>;
    onSelectionChange: (ids: Set<number>) => void;
    onPlotClick?: (plotId: number) => void;
    onViewportChange: (viewport: ViewportParams) => void;
    lassoMode: boolean;
}

export function AdminPlotsMap({
    plots,
    clusters,
    mode,
    selectedIds,
    onSelectionChange,
    onPlotClick,
    onViewportChange,
    lassoMode,
}: AdminPlotsMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const polygonsRef = useRef<Map<number, L.Polygon>>(new Map());
    const clustersRef = useRef<L.CircleMarker[]>([]);
    const lassoPointsRef = useRef<L.LatLng[]>([]);
    const lassoPolylineRef = useRef<L.Polyline | null>(null);
    const hasFittedRef = useRef(false);
    const isFirstLoadRef = useRef(true);
    const currentZoomRef = useRef<number>(10);

    // Цвета полигонов
    const getPolygonColor = useCallback(
        (plot: PlotMapItem, isSelected: boolean) => {
            if (isSelected) return "#f59e0b"; // Оранжевый - выделенный
            if (plot.listing_id === null) return "#22c55e"; // Зелёный - не привязан
            return "#3b82f6"; // Синий - привязан
        },
        []
    );

    // Инициализация карты
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [54.7104, 20.4522], // Калининград
            zoom: 10,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        // Обработчик изменения viewport
        const handleViewportChange = () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            currentZoomRef.current = zoom; // Сохраняем текущий зум
            onViewportChange({
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
                zoom: zoom,
            });
        };

        map.on("moveend", handleViewportChange);
        map.on("zoomend", handleViewportChange);

        // Первоначальный вызов
        setTimeout(() => handleViewportChange(), 100);

        mapRef.current = map;

        return () => {
            map.off("moveend", handleViewportChange);
            map.off("zoomend", handleViewportChange);
            map.remove();
            mapRef.current = null;
            hasFittedRef.current = false;
            isFirstLoadRef.current = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Отрисовка кластеров
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Всегда очищаем старые кластеры при любом изменении mode
        clustersRef.current.forEach((cluster) => cluster.remove());
        clustersRef.current = [];

        // Если режим кластеров — очищаем также полигоны
        if (mode === "clusters") {
            polygonsRef.current.forEach((polygon) => polygon.remove());
            polygonsRef.current.clear();
        }

        if (mode !== "clusters") return;

        clusters.forEach((cluster) => {
            const radius = Math.min(40, Math.max(15, 12 + Math.log10(cluster.count) * 10));

            const circle = L.circleMarker([cluster.center[0], cluster.center[1]], {
                radius: radius,
                fillColor: "#14b8a6",   // teal-500
                fillOpacity: 1,          // непрозрачный
                color: "#0f766e",        // teal-700 border
                weight: 2,
            });

            // Tooltip с количеством
            circle.bindTooltip(`${cluster.count}`, {
                permanent: true,
                direction: "center",
                className: "cluster-tooltip",
            });

            // Клик — zoom к границам
            circle.on("click", () => {
                const bounds = L.latLngBounds(
                    [cluster.bounds[0][0], cluster.bounds[0][1]],
                    [cluster.bounds[1][0], cluster.bounds[1][1]]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            });

            circle.addTo(map);
            clustersRef.current.push(circle);
        });
    }, [clusters, mode]);


    // Отрисовка полигонов
    useEffect(() => {
        const map = mapRef.current;
        if (!map || mode !== "plots") return;

        // Очищаем старые полигоны
        polygonsRef.current.forEach((polygon) => polygon.remove());
        polygonsRef.current.clear();

        if (plots.length === 0) return;

        plots.forEach((plot) => {
            if (!plot.polygon_coords || plot.polygon_coords.length === 0) return;

            const isSelected = selectedIds.has(plot.id);
            const color = getPolygonColor(plot, isSelected);

            const polygon = L.polygon(plot.polygon_coords as L.LatLngExpression[], {
                color: color,
                fillColor: color,
                fillOpacity: isSelected ? 0.5 : 0.3,
                weight: isSelected ? 3 : 2,
            });

            // Tooltip с кадастровым номером (только при zoom >= 16)
            if (plot.cadastral_number && currentZoomRef.current >= 16) {
                polygon.bindTooltip(plot.cadastral_number, {
                    permanent: true,
                    direction: "center",
                    className: "cadastral-tooltip",
                });
            }

            // Popup с информацией
            const areaInSotki = plot.area ? (plot.area / 100).toFixed(2) : "—";
            const statusText =
                plot.status === "active"
                    ? "В продаже"
                    : plot.status === "sold"
                        ? "Продан"
                        : "Зарезервирован";
            const bindingText =
                plot.listing_id !== null
                    ? `Объявление #${plot.listing_id}`
                    : "Не привязан";

            polygon.bindPopup(`
                <div style="min-width: 150px">
                    <strong>${plot.cadastral_number || "Без номера"}</strong><br/>
                    Площадь: ${areaInSotki} сот.<br/>
                    Статус: ${statusText}<br/>
                    ${bindingText}
                </div>
            `);

            // Клик для выделения
            polygon.on("click", (e) => {
                L.DomEvent.stopPropagation(e);
                const newSelection = new Set(selectedIds);

                if (e.originalEvent.ctrlKey || e.originalEvent.metaKey || e.originalEvent.shiftKey) {
                    if (newSelection.has(plot.id)) {
                        newSelection.delete(plot.id);
                    } else {
                        newSelection.add(plot.id);
                    }
                } else {
                    if (newSelection.has(plot.id) && newSelection.size === 1) {
                        newSelection.clear();
                    } else {
                        newSelection.clear();
                        newSelection.add(plot.id);
                    }
                }

                onSelectionChange(newSelection);
                onPlotClick?.(plot.id);
            });

            polygon.addTo(map);
            polygonsRef.current.set(plot.id, polygon);
        });
    }, [plots, selectedIds, getPolygonColor, onSelectionChange, onPlotClick, mode]);

    // Режим лассо
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (lassoMode && mode === "plots") {
            map.dragging.disable();
            map.getContainer().style.cursor = "crosshair";

            const onMouseDown = (e: L.LeafletMouseEvent) => {
                lassoPointsRef.current = [e.latlng];
                lassoPolylineRef.current = L.polyline([e.latlng], {
                    color: "#f59e0b",
                    weight: 2,
                    dashArray: "5, 5",
                }).addTo(map);
            };

            const onMouseMove = (e: L.LeafletMouseEvent) => {
                if (!lassoPolylineRef.current) return;
                lassoPointsRef.current.push(e.latlng);
                lassoPolylineRef.current.addLatLng(e.latlng);
            };

            const onMouseUp = () => {
                if (!lassoPolylineRef.current || lassoPointsRef.current.length < 3) {
                    lassoPolylineRef.current?.remove();
                    lassoPolylineRef.current = null;
                    return;
                }

                const lassoPolygon = L.polygon(lassoPointsRef.current);
                const lassoBounds = lassoPolygon.getBounds();

                const newSelection = new Set(selectedIds);
                plots.forEach((plot) => {
                    if (!plot.polygon_coords || plot.polygon_coords.length === 0) return;

                    const center = L.polygon(plot.polygon_coords as L.LatLngExpression[]).getBounds().getCenter();
                    if (lassoBounds.contains(center)) {
                        newSelection.add(plot.id);
                    }
                });

                onSelectionChange(newSelection);

                lassoPolylineRef.current?.remove();
                lassoPolylineRef.current = null;
                lassoPointsRef.current = [];
            };

            map.on("mousedown", onMouseDown);
            map.on("mousemove", onMouseMove);
            map.on("mouseup", onMouseUp);

            return () => {
                map.off("mousedown", onMouseDown);
                map.off("mousemove", onMouseMove);
                map.off("mouseup", onMouseUp);
                map.dragging.enable();
                map.getContainer().style.cursor = "";
            };
        }
    }, [lassoMode, plots, selectedIds, onSelectionChange, mode]);

    return (
        <>
            <style jsx global>{`
                .cadastral-tooltip {
                    background: rgba(0, 0, 0, 0.7);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    white-space: nowrap;
                }
                .cadastral-tooltip::before {
                    display: none;
                }
                .cluster-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    color: white;
                    font-size: 13px;
                    font-weight: bold;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                .cluster-tooltip::before {
                    display: none !important;
                }
            `}</style>
            <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
        </>
    );
}
