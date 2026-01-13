"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, LayersControl, useMapEvents, useMap, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { LatLngBounds, LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PlotViewportItem, ClusterItem, ViewportBounds } from "@/types/map";

interface ListingsMapProps {
    plots: PlotViewportItem[];
    clusters: ClusterItem[];
    selectedPlotId?: number;
    onViewportChange: (bounds: ViewportBounds, zoom: number) => void;
    onPlotClick: (plot: PlotViewportItem) => void;
    onClusterClick: (cluster: ClusterItem) => void;
    loading?: boolean;
}

// Компонент для отслеживания событий карты
function MapEventHandler({
    onViewportChange,
    onClusterClick,
    clusters,
}: {
    onViewportChange: (bounds: ViewportBounds, zoom: number) => void;
    onClusterClick: (cluster: ClusterItem) => void;
    clusters: ClusterItem[];
}) {
    const map = useMapEvents({
        moveend: () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            onViewportChange(
                {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                },
                zoom
            );
        },
        zoomend: () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            onViewportChange(
                {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                },
                zoom
            );
        },
    });

    // Начальный вызов при монтировании
    useEffect(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        onViewportChange(
            {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
            },
            zoom
        );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}

// Компонент кластера
function ClusterMarker({
    cluster,
    onClusterClick,
}: {
    cluster: ClusterItem;
    onClusterClick: (cluster: ClusterItem) => void;
}) {
    const map = useMap();

    // Размер зависит от количества участков
    const radius = Math.min(40, Math.max(20, 15 + Math.log10(cluster.count) * 12));

    const handleClick = () => {
        // Zoom к границам кластера
        const bounds = new LatLngBounds(
            [cluster.bounds[0][0], cluster.bounds[0][1]],
            [cluster.bounds[1][0], cluster.bounds[1][1]]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
        onClusterClick(cluster);
    };

    return (
        <CircleMarker
            center={[cluster.center[0], cluster.center[1]]}
            radius={radius}
            pathOptions={{
                fillColor: "#14b8a6",  // teal-500
                fillOpacity: 1,         // непрозрачный
                color: "#0f766e",       // teal-700 border
                weight: 2,
            }}
            eventHandlers={{ click: handleClick }}
        >
            {/* Постоянный tooltip с количеством */}
            <Tooltip permanent direction="center" className="cluster-count-tooltip">
                <span className="font-bold text-white">{cluster.count}</span>
            </Tooltip>
            <Popup>
                <div className="text-center">
                    <div className="font-bold text-lg">{cluster.count}</div>
                    <div className="text-sm text-muted-foreground">участков</div>
                    {cluster.price_range && (
                        <div className="text-xs mt-1">
                            от {(cluster.price_range[0] / 1000000).toFixed(1)} до{" "}
                            {(cluster.price_range[1] / 1000000).toFixed(1)} млн ₽
                        </div>
                    )}

                </div>
            </Popup>
        </CircleMarker>
    );
}

// Создание иконки маркера для участка
function createPlotMarkerIcon(isSelected: boolean, listingId: number | null): DivIcon {
    const hasListing = listingId !== null;
    const color = isSelected ? "#3b82f6" : hasListing ? "#10b981" : "#6b7280";
    const size = isSelected ? 32 : 24;

    return new DivIcon({
        className: "custom-marker",
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.15s;
                ${isSelected ? 'transform: scale(1.15);' : ''}
            ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

export function ListingsMap({
    plots,
    clusters,
    selectedPlotId,
    onViewportChange,
    onPlotClick,
    onClusterClick,
    loading,
}: ListingsMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Загрузка карты...</p>
            </div>
        );
    }

    // Центр по умолчанию — Калининград
    const defaultCenter: LatLngExpression = [54.7104, 20.4522];

    return (
        <div className="h-full w-full relative">
            <style jsx global>{`
                .cluster-count-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    font-weight: bold;
                    font-size: 12px;
                    color: white;
                }
                .cluster-count-tooltip::before {
                    display: none !important;
                }
            `}</style>

            {loading && (
                <div className="absolute top-2 right-2 z-[1000] bg-white/80 rounded px-3 py-1 text-sm">
                    Загрузка...
                </div>
            )}


            <MapContainer
                center={defaultCenter}
                zoom={9}
                className="h-full w-full"
                scrollWheelZoom={true}
                attributionControl={false}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Карта">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Спутник">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <MapEventHandler
                    onViewportChange={onViewportChange}
                    onClusterClick={onClusterClick}
                    clusters={clusters}
                />

                {/* Отображение кластеров (при низком зуме) */}
                {clusters.map((cluster, index) => (
                    <ClusterMarker
                        key={`cluster-${index}`}
                        cluster={cluster}
                        onClusterClick={onClusterClick}
                    />
                ))}

                {/* Отображение участков (при высоком зуме) */}
                {plots.map((plot) => {
                    // Используем centroid из polygon_coords
                    if (!plot.polygon_coords || plot.polygon_coords.length === 0) return null;

                    // Вычисляем центроид полигона
                    const latSum = plot.polygon_coords.reduce((sum, coord) => sum + coord[0], 0);
                    const lonSum = plot.polygon_coords.reduce((sum, coord) => sum + coord[1], 0);
                    const center: [number, number] = [
                        latSum / plot.polygon_coords.length,
                        lonSum / plot.polygon_coords.length,
                    ];

                    const isSelected = plot.listing_id === selectedPlotId;
                    const icon = createPlotMarkerIcon(isSelected, plot.listing_id);

                    return (
                        <Marker
                            key={`plot-${plot.id}`}
                            position={center}
                            icon={icon}
                            eventHandlers={{
                                click: () => onPlotClick(plot),
                            }}
                        />
                    );
                })}
            </MapContainer>
        </div>
    );
}
