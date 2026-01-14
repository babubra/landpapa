"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, LayersControl, useMapEvents, useMap, CircleMarker, Tooltip } from "react-leaflet";
import { LatLngBounds, LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarkerItem, ViewportBounds } from "@/types/map";

interface ListingsMapProps {
    markers: MapMarkerItem[];
    selectedListingSlug?: string;
    onViewportChange: (bounds: ViewportBounds, zoom: number) => void;
    onMarkerClick: (marker: MapMarkerItem) => void;
    loading?: boolean;
    initialCenter?: [number, number];
    initialZoom?: number;
}

// Компонент для отслеживания событий карты
function MapEventHandler({
    onViewportChange,
}: {
    onViewportChange: (bounds: ViewportBounds, zoom: number) => void;
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

// Компонент кластера (мемоизированный)
const ClusterMarker = React.memo(function ClusterMarker({
    marker,
    onClick,
}: {
    marker: MapMarkerItem;
    onClick: () => void;
}) {
    const map = useMap();

    // Фиксированный размер кластера (не зависит от количества участков)
    const radius = 18;

    const handleClick = () => {
        // Zoom к границам кластера
        if (marker.bounds) {
            const bounds = new LatLngBounds(
                [marker.bounds[0][0], marker.bounds[0][1]],
                [marker.bounds[1][0], marker.bounds[1][1]]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        onClick();
    };

    return (
        <CircleMarker
            center={[marker.lat, marker.lon]}
            radius={radius}
            pathOptions={{
                fillColor: "#14b8a6",  // teal-500
                fillOpacity: 1,
                color: "#0f766e",       // teal-700 border
                weight: 2,
            }}
            eventHandlers={{ click: handleClick }}
        >
            <Tooltip permanent direction="center" className="cluster-count-tooltip">
                <span className="font-bold text-white">{marker.count}</span>
            </Tooltip>
        </CircleMarker>
    );
});

// Создание иконки маркера для участка
function createPlotMarkerIcon(isSelected: boolean): DivIcon {
    const color = isSelected ? "#3b82f6" : "#10b981";  // blue-500 / emerald-500
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

// Компонент маркера точки (мемоизированный)
const PointMarker = React.memo(function PointMarker({
    marker,
    isSelected,
    onClick,
}: {
    marker: MapMarkerItem;
    isSelected: boolean;
    onClick: () => void;
}) {
    const icon = createPlotMarkerIcon(isSelected);

    return (
        <Marker
            position={[marker.lat, marker.lon]}
            icon={icon}
            eventHandlers={{ click: onClick }}
        />
    );
});

// Дефолтные значения для Калининграда
const DEFAULT_CENTER: [number, number] = [54.7104, 20.4522];
const DEFAULT_ZOOM = 9;

export function ListingsMap({
    markers,
    selectedListingSlug,
    onViewportChange,
    onMarkerClick,
    loading,
    initialCenter = DEFAULT_CENTER,
    initialZoom = DEFAULT_ZOOM,
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
                center={initialCenter}
                zoom={initialZoom}
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

                <MapEventHandler onViewportChange={onViewportChange} />

                {/* Рендер маркеров */}
                {markers.map((marker) => {
                    if (marker.type === "cluster") {
                        return (
                            <ClusterMarker
                                key={`cluster-${marker.id}`}
                                marker={marker}
                                onClick={() => onMarkerClick(marker)}
                            />
                        );
                    } else {
                        const isSelected = marker.listing_slug === selectedListingSlug;
                        return (
                            <PointMarker
                                key={`point-${marker.id}`}
                                marker={marker}
                                isSelected={isSelected}
                                onClick={() => onMarkerClick(marker)}
                            />
                        );
                    }
                })}
            </MapContainer>
        </div>
    );
}
