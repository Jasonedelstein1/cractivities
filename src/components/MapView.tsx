import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { activities, lodgingIds } from '../data';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '../data/schema';
import { useApp } from '../lib/app-context';
import { isClosedOnDate } from '../lib/time';

// Resolved hex colours (Leaflet paints SVG, so CSS vars can't be used directly).
const CAT_HEX: Record<Category, string> = {
  eat: '#d9662f',
  nature: '#2f8f4e',
  water: '#2a7fbf',
  culture: '#8a4fbf',
  wellness: '#d04c8a',
  town: '#6b7280',
};

export function MapView() {
  const { lodging, date, location, requestLocation, openDetail } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Build the map once.
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const map = L.map(el.current, {
      center: [lodging.lat, lodging.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: true,
    });
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    tiles.addTo(map);

    for (const a of activities) {
      const isLodging = lodgingIds.has(a.id);
      const closed = isClosedOnDate(a, date);
      const marker = isLodging
        ? L.marker([a.lat, a.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:26px;height:26px;border-radius:8px;background:#1d2a2a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">⌂</div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
            zIndexOffset: 1000,
          })
        : L.circleMarker([a.lat, a.lng], {
            radius: 9,
            color: '#fff',
            weight: 2,
            fillColor: CAT_HEX[a.category],
            fillOpacity: closed ? 0.45 : 0.95,
          });
      marker.bindTooltip(a.name, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => openDetail(a.id));
      marker.addTo(map);
    }

    userLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Markers are rebuilt only on remount; date changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when the lodging for the viewed date changes.
  useEffect(() => {
    mapRef.current?.setView([lodging.lat, lodging.lng], mapRef.current.getZoom(), { animate: true });
  }, [lodging]);

  // User location dot.
  useEffect(() => {
    const layer = userLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (location.kind === 'granted') {
      L.circleMarker([location.point.lat, location.point.lng], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#1a73e8',
        fillOpacity: 1,
      })
        .bindTooltip('You', { direction: 'top' })
        .addTo(layer);
      L.circle([location.point.lat, location.point.lng], {
        radius: 150,
        color: '#1a73e8',
        weight: 1,
        fillColor: '#1a73e8',
        fillOpacity: 0.12,
      }).addTo(layer);
    }
  }, [location]);

  const goToUser = () => {
    if (location.kind === 'granted') {
      mapRef.current?.setView([location.point.lat, location.point.lng], 15, { animate: true });
    } else {
      requestLocation();
    }
  };

  const goToLodging = () => mapRef.current?.setView([lodging.lat, lodging.lng], 14, { animate: true });

  return (
    <div className="map-page">
      <div ref={el} style={{ height: '100%' }} />
      {(!online || tileError) && (
        <div className="map-offline">
          Offline — showing tiles seen before. The list still works.
        </div>
      )}
      <div className="map-toolbar">
        <button type="button" onClick={goToLodging}>⌂ Lodging</button>
        <button type="button" onClick={goToUser}>
          {location.kind === 'loading' ? '…' : location.kind === 'granted' ? '◎ Me' : '◎ Locate me'}
        </button>
      </div>
      <div className="map-legend" aria-label="Legend">
        {CATEGORIES.map((c) => (
          <span key={c}>
            <i style={{ ['--cat' as string]: CAT_HEX[c] }} />
            {CATEGORY_LABEL[c]}
          </span>
        ))}
      </div>
    </div>
  );
}
