'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

// Fix Leaflet default marker icon issue with webpack/next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface SiteMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: string;
  radius?: number;
}

function MapEventsHandler({ onLocationChange }: { onLocationChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function SiteMapComponent({ latitude, longitude, onLocationChange, readOnly, radius }: SiteMapProps) {
  const center: [number, number] = latitude && longitude ? [latitude, longitude] : [41.3275, 19.8187];
  const zoom = latitude && longitude ? 15 : 6;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {latitude && longitude && (
        <>
          <Marker
            position={[latitude, longitude]}
            draggable={!readOnly}
            eventHandlers={
              !readOnly && onLocationChange
                ? {
                    dragend: (e) => {
                      const marker = e.target;
                      const pos = marker.getLatLng();
                      onLocationChange(pos.lat, pos.lng);
                    },
                  }
                : undefined
            }
          />
          {radius && radius > 0 && (
            <Circle
              center={[latitude, longitude]}
              radius={radius}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}
        </>
      )}
      {!readOnly && onLocationChange && <MapEventsHandler onLocationChange={onLocationChange} />}
      {latitude && longitude && <RecenterMap lat={latitude} lng={longitude} />}
    </MapContainer>
  );
}

export const SiteMap = dynamic(() => Promise.resolve(SiteMapComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-muted rounded-xl" style={{ height: '100%' }}>
      <div className="text-sm text-muted-foreground">Loading map...</div>
    </div>
  ),
});
