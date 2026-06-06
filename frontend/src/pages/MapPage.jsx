import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Copy, Navigation } from 'lucide-react';
import { position } from '../data/mockData.js';
import { useReverseGeocode } from '../hooks/useReverseGeocode.js';

export default function MapPage({ socketState }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const { address, status } = useReverseGeocode(position);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('ghost-map', { zoomControl: false }).setView([position.lat, position.lon], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      markerRef.current = L.marker([position.lat, position.lon]).addTo(map);
      mapRef.current = map;
    }

    markerRef.current?.setLatLng([position.lat, position.lon]);
    mapRef.current?.setView([position.lat, position.lon], 15);
  }, []);

  const copyAddress = () => navigator.clipboard?.writeText(address);
  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lon}`, '_blank');
  };

  return (
    <section className="map-layout">
      <div id="ghost-map" className="map-canvas" />
      <aside className="map-panel">
        <h2>LIVE POSITION</h2>
        <p className="mono">{position.lat}, {position.lon}</p>
        <p>{address}</p>
        <p className="muted">GEOCODE: {status.toUpperCase()} / WS: {socketState.toUpperCase()}</p>
        <div className="button-row">
          <button type="button" onClick={copyAddress}><Copy size={16} /> COPY</button>
          <button type="button" onClick={openNavigation}><Navigation size={16} /> NAV</button>
        </div>
      </aside>
    </section>
  );
}
