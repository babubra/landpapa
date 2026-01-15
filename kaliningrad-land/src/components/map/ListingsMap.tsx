"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, LayersControl } from "react-leaflet";
import { Icon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { PlotPoint, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";

// Фикс для иконок Leaflet в Next.js
const defaultIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Зелёная иконка для выбранных маркеров
const selectedIcon = new Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
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
            >
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
                    spiderfyOnMaxZoom={true}
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
