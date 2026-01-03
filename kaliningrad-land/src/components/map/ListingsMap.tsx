"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, LayersControl, useMap } from "react-leaflet";
import { LatLngBoundsExpression, LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingData } from "@/types/listing";

interface ListingsMapProps {
    listings: ListingData[];
    selectedId?: number;
    onMarkerClick: (listing: ListingData) => void;
}

// Компонент для автоматического масштабирования (только при первичной загрузке)
function MapBoundsUpdater({ listings }: { listings: ListingData[] }) {
    const map = useMap();
    const hasFittedRef = useRef(false);

    useEffect(() => {
        // Устанавливаем масштаб только один раз при первичной загрузке данных
        if (hasFittedRef.current || listings.length === 0) return;

        // Собираем все координаты из всех объявлений
        const allCoords: [number, number][] = [];
        listings.forEach(l => {
            if (l.coordinates && l.coordinates.length > 0) {
                l.coordinates.forEach((coord: number[]) => {
                    allCoords.push([coord[0], coord[1]]);
                });
            }
        });

        if (allCoords.length === 0) return;

        if (allCoords.length === 1) {
            map.setView(allCoords[0], 14);
        } else {
            const bounds: LatLngBoundsExpression = allCoords as LatLngBoundsExpression;
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        hasFittedRef.current = true;
    }, [listings, map]);

    return null;
}

// Создание кастомной иконки маркера
function createMarkerIcon(isSelected: boolean, isFeatured: boolean): DivIcon {
    const color = isSelected ? "#3b82f6" : isFeatured ? "#f59e0b" : "#10b981";
    const size = isSelected ? 36 : 28;

    return new DivIcon({
        className: "custom-marker",
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s;
                ${isSelected ? 'transform: scale(1.2);' : ''}
            ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

export function ListingsMap({ listings, selectedId, onMarkerClick }: ListingsMapProps) {
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

            <MapBoundsUpdater listings={listings} />

            {/* Для каждого объявления отображаем все его маркеры */}
            {listings.map((listing) => {
                if (!listing.coordinates || listing.coordinates.length === 0) return null;

                const isSelected = listing.id === selectedId;
                const icon = createMarkerIcon(isSelected, listing.is_featured ?? false);

                // Отображаем маркер для каждой координаты участка
                return listing.coordinates.map((coord, index) => (
                    <Marker
                        key={`${listing.id}-${index}`}
                        position={[coord[0], coord[1]]}
                        icon={icon}
                        eventHandlers={{
                            click: () => onMarkerClick(listing),
                        }}
                    />
                ));
            })}
        </MapContainer>
    );
}
