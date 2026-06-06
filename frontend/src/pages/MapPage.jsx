import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Copy, Navigation } from 'lucide-react';
import { position } from '../data/mockData.js';
import { useReverseGeocode } from '../hooks/useReverseGeocode.js';

export default function MapPage({ socketState }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [selected, setSelected] = useState('A');
  const [mapMode, setMapMode] = useState('DARK');
  const { address, status } = useReverseGeocode(position);
  const devices = useMemo(
    () => [
      {
        id: 'A',
        label: 'DEVICE A',
        status: socketState === 'online' ? 'online' : 'offline',
        color: 'accent',
        lat: position.lat,
        lon: position.lon,
        address,
        lastSeen: 'LIVE',
      },
      {
        id: 'B',
        label: 'DEVICE B',
        status: 'offline',
        color: 'blue',
        lat: 35.6892,
        lon: 139.7000,
        address: 'Last known: Shinjuku sector',
        lastSeen: '15 MIN AGO',
      },
    ],
    [address, socketState]
  );

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('ghost-map', { attributionControl: false, zoomControl: false }).setView([position.lat, position.lon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      markerRef.current = L.marker([position.lat, position.lon]).addTo(map);
      mapRef.current = map;
    }

    markerRef.current?.setLatLng([position.lat, position.lon]);
    mapRef.current?.setView([position.lat, position.lon], 13);
  }, []);

  const selectedDevice = devices.find((device) => device.id === selected) || devices[0];
  const copyAddress = () => navigator.clipboard?.writeText(selectedDevice.address);
  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedDevice.lat},${selectedDevice.lon}`, '_blank');
  };

  return (
    <section className="page-stack">
      <div className="map-header-row">
        <div>
          <h2>GHOST MAP</h2>
          <p className="muted">A: {socketState.toUpperCase()} / B: OFFLINE</p>
        </div>
        <div className="mode-switch">
          {['DARK', 'STREET', 'SAT'].map((mode) => (
            <button className={mapMode === mode ? 'active' : ''} key={mode} type="button" onClick={() => setMapMode(mode)}>
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className={`map-shell map-${mapMode.toLowerCase()}`}>
        <div id="ghost-map" className="map-canvas" />
        <div className="map-grid-overlay" />
        {devices.map((device, index) => (
          <button
            className={`map-pin ${device.color} ${device.status === 'offline' ? 'offline' : ''}`}
            key={device.id}
            style={{ left: index === 0 ? '42%' : '64%', top: index === 0 ? '42%' : '30%' }}
            type="button"
            onClick={() => setSelected(device.id)}
          >
            <span>{device.id}</span>
          </button>
        ))}
        <div className="map-distance">RANGE 4.2KM</div>
        <div className="map-provider">OpenStreetMap</div>
      </div>
      <aside className="map-panel cyber-card">
        <div className="panel-title-row">
          <h2>{selectedDevice.label}</h2>
          <span className={`pill ${selectedDevice.status === 'online' ? 'online' : 'warning'}`}>
            {selectedDevice.status.toUpperCase()}
          </span>
        </div>
        <p className="mono">{selectedDevice.lat.toFixed(5)}, {selectedDevice.lon.toFixed(5)}</p>
        <p>{selectedDevice.address}</p>
        <p className="muted">GEOCODE: {status.toUpperCase()} / LAST: {selectedDevice.lastSeen}</p>
        <div className="button-row">
          <button type="button" onClick={copyAddress}><Copy size={16} /> COPY</button>
          <button type="button" onClick={openNavigation}><Navigation size={16} /> NAV</button>
        </div>
      </aside>
      {devices.map((device) => (
        <button className={selected === device.id ? 'device-card selected' : 'device-card'} key={device.id} type="button" onClick={() => setSelected(device.id)}>
          <span className={`device-dot ${device.color}`} />
          <strong>{device.label}</strong>
          <span>{device.address}</span>
          <em>{device.status.toUpperCase()}</em>
        </button>
      ))}
    </section>
  );
}
