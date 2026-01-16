"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, LayersControl, ZoomControl } from "react-leaflet";
import { DivIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { PlotPoint, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";

// Кружки вместо булавок — простой и компактный вид
const defaultIcon = new DivIcon({
    className: "custom-marker",
    html: `<div style="
        width: 14px;
        height: 14px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

// Зелёный кружок для выбранного маркера
const selectedIcon = new DivIcon({
    className: "custom-marker-selected",
    html: `<div style="
        width: 18px;
        height: 18px;
        background: #22c55e;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

interface ListingsMapProps {
    plots: PlotPoint[];
    selectedListingSlug?: string;
    onMarkerClick: (plot: PlotPoint) => void;
    loading?: boolean;
    initialCenter?: [number, number];
    initialZoom?: number;
}



export function ListingsMap({
    plots,
    selectedListingSlug,
    onMarkerClick,
    loading,
    initialCenter = DEFAULT_MAP_CENTER,
    initialZoom = DEFAULT_MAP_ZOOM,
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
                zoomControl={false}
            >
                {/* ZoomControl справа, чтобы не перекрывать панель объявления */}
                <ZoomControl position="bottomright" />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Карта">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Спутник">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={80}
                    spiderfyOnMaxZoom={false}
                    showCoverageOnHover={false}
                    zoomToBoundsOnClick={true}
                    disableClusteringAtZoom={16}
                >
                    {plots.map((plot) => {
                        const isSelected = plot.listing_slug === selectedListingSlug;
                        return (
                            <Marker
                                key={plot.id}
                                position={[plot.lat, plot.lon]}
                                icon={isSelected ? selectedIcon : defaultIcon}
                                eventHandlers={{
                                    click: () => onMarkerClick(plot),
                                }}
                            />
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
