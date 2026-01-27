"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, ZoomControl } from "react-leaflet";
import { DivIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "@/styles/popup.css";
import { PlotPoint, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";
import { MapUrlSync } from "./MapUrlSync";

// Форматирование цены
function formatPrice(price: number): string {
    return new Intl.NumberFormat("ru-RU").format(price);
}

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
    selectedListingSlug?: string;  // Slug выбранного объявления для выделения ВСЕХ его участков
    onMarkerClick?: (plot: PlotPoint) => void;
    loading?: boolean;
    initialCenter?: [number, number];
    initialZoom?: number;
    isMobile?: boolean;  // Показывать popup только на мобильных
}

export function ListingsMap({
    plots,
    selectedListingSlug,
    onMarkerClick,
    loading,
    initialCenter = DEFAULT_MAP_CENTER,
    initialZoom = DEFAULT_MAP_ZOOM,
    isMobile = false,
}: ListingsMapProps) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [activeListingSlug, setActiveListingSlug] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Переход на страницу участка
    const handleDetailsClick = (plot: PlotPoint) => {
        const url = plot.district_slug && plot.settlement_slug
            ? `/catalog/${plot.district_slug}/${plot.settlement_slug}/${plot.listing_slug}`
            : `/listing/${plot.listing_slug}`;
        router.push(url);
    };

    // Клик по маркеру — выделить все участки этого объявления
    const handleMarkerClick = (plot: PlotPoint) => {
        setActiveListingSlug(plot.listing_slug);
        onMarkerClick?.(plot);
    };

    // Определяем выбранный slug (из пропса или из локального состояния)
    const currentSelectedSlug = selectedListingSlug || activeListingSlug;

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
                {/* Синхронизация позиции карты с URL */}
                <MapUrlSync />

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
                        // Выделяем ВСЕ участки, которые принадлежат выбранному объявлению
                        const isSelected = plot.listing_slug === currentSelectedSlug;

                        return (
                            <Marker
                                key={plot.id}
                                position={[plot.lat, plot.lon]}
                                icon={isSelected ? selectedIcon : defaultIcon}
                                eventHandlers={{
                                    click: () => handleMarkerClick(plot),
                                }}
                            >
                                {/* Popup показывается ТОЛЬКО на мобильных */}
                                {isMobile && (
                                    <Popup className="plot-popup" closeButton={false}>
                                        <h3 className="plot-popup-title">{plot.title}</h3>
                                        <p className="plot-popup-price">
                                            {plot.price ? `${formatPrice(plot.price)} ₽` : "Цена по запросу"}
                                        </p>
                                        <p className="plot-popup-hint">
                                            Для просмотра детальной информации и контура участка нажмите Подробнее
                                        </p>
                                        <button
                                            className="plot-popup-button"
                                            onClick={() => handleDetailsClick(plot)}
                                        >
                                            Подробнее
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </button>
                                    </Popup>
                                )}
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
