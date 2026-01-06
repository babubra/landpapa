"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { PlotMapItem } from "@/lib/api";

interface AdminPlotsMapProps {
    plots: PlotMapItem[];
    selectedIds: Set<number>;
    onSelectionChange: (ids: Set<number>) => void;
    onPlotClick?: (plotId: number) => void;
    lassoMode: boolean;
}

export function AdminPlotsMap({
    plots,
    selectedIds,
    onSelectionChange,
    onPlotClick,
    lassoMode,
}: AdminPlotsMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const polygonsRef = useRef<Map<number, L.Polygon>>(new Map());
    const lassoPointsRef = useRef<L.LatLng[]>([]);
    const lassoPolylineRef = useRef<L.Polyline | null>(null);

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
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Отрисовка полигонов
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Очищаем старые полигоны
        polygonsRef.current.forEach((polygon) => polygon.remove());
        polygonsRef.current.clear();

        if (plots.length === 0) return;

        const bounds: L.LatLngBoundsExpression = [];

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

            // Tooltip с кадастровым номером
            if (plot.cadastral_number) {
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
                    // Мультиселект
                    if (newSelection.has(plot.id)) {
                        newSelection.delete(plot.id);
                    } else {
                        newSelection.add(plot.id);
                    }
                } else {
                    // Одиночный выбор
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

            // Для bounds
            plot.polygon_coords.forEach((coord) => {
                bounds.push(coord as L.LatLngTuple);
            });
        });

        // Подстройка карты под все полигоны
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [plots, selectedIds, getPolygonColor, onSelectionChange]);

    // Режим лассо
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (lassoMode) {
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

                // Создаём полигон лассо
                const lassoPolygon = L.polygon(lassoPointsRef.current);
                const lassoBounds = lassoPolygon.getBounds();

                // Находим пересекающиеся участки
                const newSelection = new Set(selectedIds);
                plots.forEach((plot) => {
                    if (!plot.polygon_coords || plot.polygon_coords.length === 0) return;

                    // Проверяем, пересекается ли центр участка с лассо
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
    }, [lassoMode, plots, selectedIds, onSelectionChange]);

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
      `}</style>
            <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
        </>
    );
}
