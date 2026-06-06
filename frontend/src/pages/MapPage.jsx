import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Copy, Navigation } from 'lucide-react';
import { position } from '../data/mockData.js';
import { useReverseGeocode } from '../hooks/useReverseGeocode.js';
import { statusJa } from '../utils/format.js';

const geolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

export default function MapPage({ socketState }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [selected, setSelected] = useState('A');
  const [gpsPosition, setGpsPosition] = useState(position);
  const { address, status } = useReverseGeocode(gpsPosition);
  const devices = useMemo(
    () => [
      {
        id: 'A',
        label: '端末A',
        status: socketState === 'online' ? 'online' : 'offline',
        color: 'accent',
        lat: gpsPosition.lat,
        lon: gpsPosition.lon,
        address,
        lastSeen: '現在',
      },
      {
        id: 'B',
        label: '端末B',
        status: 'offline',
        color: 'blue',
        lat: 35.6892,
        lon: 139.7000,
        address: '最終確認: 新宿エリア',
        lastSeen: '15分前',
      },
    ],
    [address, gpsPosition, socketState]
  );

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('ghost-map', { attributionControl: true, zoomControl: false }).setView([gpsPosition.lat, gpsPosition.lon], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
      }).addTo(map);
      markerRef.current = L.marker([gpsPosition.lat, gpsPosition.lon]).addTo(map);
      mapRef.current = map;
    }

    markerRef.current?.setLatLng([gpsPosition.lat, gpsPosition.lon]);
    mapRef.current?.setView([gpsPosition.lat, gpsPosition.lon], 15);
  }, [gpsPosition]);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (next) => {
        setGpsPosition({
          lat: next.coords.latitude,
          lon: next.coords.longitude,
          speed: next.coords.speed || 0,
          updatedAt: new Date(next.timestamp).toISOString(),
        });
      },
      () => {},
      geolocationOptions
    );
    return () => navigator.geolocation.clearWatch(watchId);
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
          <h2>位置監視</h2>
          <p className="muted">端末A: {statusJa(socketState)} / 端末B: 切断</p>
        </div>
        <div className="mode-switch">
          <button className="active" type="button">ダーク地図</button>
        </div>
      </div>
      <div className="map-shell">
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
        <div className="map-distance">距離 4.2km</div>
        <div className="map-provider">ダーク地図</div>
      </div>
      <aside className="map-panel cyber-card">
        <div className="panel-title-row">
          <h2>{selectedDevice.label}</h2>
          <span className={`pill ${selectedDevice.status === 'online' ? 'online' : 'warning'}`}>
            {statusJa(selectedDevice.status)}
          </span>
        </div>
        <p className="mono">{selectedDevice.lat.toFixed(5)}, {selectedDevice.lon.toFixed(5)}</p>
        <p>{selectedDevice.address}</p>
        <p className="muted">住所取得: {statusJa(status)} / 最終確認: {selectedDevice.lastSeen}</p>
        <div className="button-row">
          <button type="button" onClick={copyAddress}><Copy size={16} /> コピー</button>
          <button type="button" onClick={openNavigation}><Navigation size={16} /> ナビ</button>
        </div>
      </aside>
      {devices.map((device) => (
        <button className={selected === device.id ? 'device-card selected' : 'device-card'} key={device.id} type="button" onClick={() => setSelected(device.id)}>
          <span className={`device-dot ${device.color}`} />
          <strong>{device.label}</strong>
          <span>{device.address}</span>
          <em>{statusJa(device.status)}</em>
        </button>
      ))}
    </section>
  );
}
