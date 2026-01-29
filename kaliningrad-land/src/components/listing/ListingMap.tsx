"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Marker, LayersControl, Tooltip, useMap } from "react-leaflet";
import { LatLngBoundsExpression, LatLngExpression, Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListingContext } from "@/context/ListingContext";

// Типы
export interface PlotForMap {
    id: number;
    cadastral_number: string | null;
    area: number | null;
    price_public: number | null;  // Цена участка
    status: string;  // active | reserved | sold
    latitude: number | null;
    longitude: number | null;
    polygon: [number, number][] | null;
}

interface ListingMapProps {
    plots: PlotForMap[];
    className?: string;
}

// Цвета по статусу участка
const STATUS_COLORS: Record<string, string> = {
    active: "#10b981",    // Зелёный — в продаже
    reserved: "#f59e0b",  // Оранжевый — забронирован
    sold: "#ef4444",      // Красный — продан
};

// Минимальный зум для показа подписей
const MIN_ZOOM_FOR_LABELS = 18;

// Функция для вычисления границ карты (с уменьшенным отступом)
function calculateBounds(plots: PlotForMap[]): LatLngBoundsExpression | null {
    const allCoords: [number, number][] = [];

    plots.forEach(plot => {
        if (plot.polygon) {
            allCoords.push(...plot.polygon);
        } else if (plot.latitude && plot.longitude) {
            allCoords.push([plot.latitude, plot.longitude]);
        }
    });

    if (allCoords.length === 0) return null;

    const lats = allCoords.map(c => c[0]);
    const lngs = allCoords.map(c => c[1]);

    // Уменьшенный отступ для более близкого приближения
    return [
        [Math.min(...lats) - 0.0003, Math.min(...lngs) - 0.0003],
        [Math.max(...lats) + 0.0003, Math.max(...lngs) + 0.0003],
    ];
}

// Функция для получения последнего блока кадастрового номера
function getShortCadastral(cadastral: string | null): string {
    if (!cadastral) return "";
    const parts = cadastral.split(":");
    return parts.length > 0 ? `:${parts[parts.length - 1]}` : "";
}

// Исправление иконки маркера для Leaflet
const defaultIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

// Компонент для отслеживания зума
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
    const map = useMap();

    useEffect(() => {
        const handleZoom = () => {
            onZoomChange(map.getZoom());
        };

        map.on('zoomend', handleZoom);
        // Инициализация
        onZoomChange(map.getZoom());

        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map, onZoomChange]);

    return null;
}

export function ListingMap({ plots, className = "" }: ListingMapProps) {
    const [currentZoom, setCurrentZoom] = useState(16);
    const { selectedPlotId, setSelectedPlotId } = useListingContext();
    const mapRef = useRef<any>(null); // Ref to accessing map instance if needed, though we use useMap inside usually
    const layerRefs = useRef<Record<number, any>>({}); // To store references to layers by ID
    const isMapClickRef = useRef(false);

    // Эффект для программного зума при выборе из сайдбара
    useEffect(() => {
        if (selectedPlotId && layerRefs.current[selectedPlotId]) {
            const layer = layerRefs.current[selectedPlotId];

            if (isMapClickRef.current) {
                // Если клик был по карте — ничего не делаем, просто выделяем
                isMapClickRef.current = false;
            } else {
                // Если выбор из списка — летим к участку
                // Если это полигон, берем его bounds
                if (layer.getBounds) {
                    const bounds = layer.getBounds();
                    // Летим к границам с небольшим отступом
                    layer._map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
                }
                // Если маркер, берем latlng
                else if (layer.getLatLng) {
                    const latlng = layer.getLatLng();
                    layer._map.flyTo(latlng, 18, { duration: 1.5 });
                }
            }
        }
    }, [selectedPlotId]);

    // Фильтруем участки с координатами
    const plotsWithCoords = plots.filter(
        p => (p.polygon && p.polygon.length > 0) || (p.latitude && p.longitude)
    );

    if (plotsWithCoords.length === 0) {
        return (
            <div className={`aspect-video rounded-lg bg-muted flex items-center justify-center ${className}`}>
                <p className="text-muted-foreground">Координаты участков не указаны</p>
            </div>
        );
    }

    const bounds = calculateBounds(plotsWithCoords);
    const defaultCenter: LatLngExpression = [54.7104, 20.4522];
    const showLabels = currentZoom >= MIN_ZOOM_FOR_LABELS;

    return (
        <div className={`aspect-video rounded-lg overflow-hidden ${className}`}>
            <MapContainer
                key="listing-map-container"
                bounds={bounds || undefined}
                center={bounds ? undefined : defaultCenter}
                zoom={bounds ? undefined : 10}
                className="h-full w-full"
                scrollWheelZoom={true}
                attributionControl={false}
                ref={mapRef}
            >
                <ZoomTracker onZoomChange={setCurrentZoom} />

                {/* Переключатель слоёв */}
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Карта">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Спутник">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {plotsWithCoords.map((plot) => {
                    const isSelected = plot.id === selectedPlotId;
                    // Цвет по статусу
                    const color = STATUS_COLORS[plot.status] || STATUS_COLORS.active;
                    const shortCadastral = getShortCadastral(plot.cadastral_number);

                    // Если есть полигон
                    if (plot.polygon && plot.polygon.length > 0) {
                        return (
                            <Polygon
                                key={plot.id}
                                ref={(el) => {
                                    if (el) layerRefs.current[plot.id] = el;
                                }}
                                positions={plot.polygon as LatLngExpression[]}
                                pathOptions={{
                                    color: color, // Цвет обводки не меняется
                                    fillColor: color,
                                    fillOpacity: isSelected ? 0.75 : 0.35, // Заливка становится более плотной
                                    weight: isSelected ? 3 : 2, // Обводка чуть толще
                                }}
                                eventHandlers={{
                                    click: () => {
                                        isMapClickRef.current = true;
                                        setSelectedPlotId(plot.id);
                                    },
                                }}
                            >
                                {/* Подпись на полигоне (только при достаточном зуме) */}
                                {showLabels && shortCadastral && (
                                    <Tooltip
                                        permanent
                                        direction="center"
                                        className="polygon-label"
                                    >
                                        <span className="text-xs font-semibold">{shortCadastral}</span>
                                    </Tooltip>
                                )}
                            </Polygon>
                        );
                    }

                    // Иначе — маркер
                    if (plot.latitude && plot.longitude) {
                        return (
                            <Marker
                                key={plot.id}
                                ref={(el) => {
                                    if (el) layerRefs.current[plot.id] = el;
                                }}
                                position={[plot.latitude, plot.longitude]}
                                icon={defaultIcon}
                                eventHandlers={{
                                    click: () => {
                                        isMapClickRef.current = true;
                                        setSelectedPlotId(plot.id);
                                    },
                                }}
                            >
                            </Marker>
                        );
                    }

                    return null;
                })}
            </MapContainer>
        </div>
    );
}

