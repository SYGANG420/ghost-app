import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Copy, Crosshair, Navigation } from 'lucide-react';
import { listLocations } from '../api/location.js';
import { useReverseGeocode } from '../hooks/useReverseGeocode.js';
import { statusJa } from '../utils/format.js';

const geolocationOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };
const TERMINAL = '\u7aef\u672b';
const WAITING_ADDRESS = '\u4f4f\u6240\u53d6\u5f97\u5f85\u6a5f\u4e2d';
const NOT_RECEIVED = '\u672a\u53d7\u4fe1';
const RECEIVING = '\u53d7\u4fe1\u4e2d';

function deviceShortId(deviceId) {
  return deviceId === 'device_b' ? 'B' : 'A';
}

function oppositeDevice(deviceId) {
  return deviceId === 'device_b' ? 'device_a' : 'device_b';
}

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    battery: location.battery ?? null,
    online: Boolean(location.online ?? true),
    websocketOnline: Boolean(location.websocket_online ?? false),
    updatedAt: location.heartbeat_at || location.updated_at || location.updatedAt || new Date().toISOString(),
  };
}

function createMarkerIcon(kind, label) {
  return L.divIcon({
    className: '',
    html: `<div class="leaflet-ghost-marker ${kind}"><span>${label}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function formatCoords(position) {
  if (!position) return 'GPS\u53d6\u5f97\u5f85\u6a5f\u4e2d';
  return `${position.lat.toFixed(6)},${position.lon.toFixed(6)}`;
}

export default function MapPage({ socketState, socketMessage, sendSocketMessage, deviceId }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const trailRef = useRef(null);
  const [selected, setSelected] = useState(deviceShortId(deviceId));
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsHistory, setGpsHistory] = useState([]);
  const [peerPosition, setPeerPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoError, setGeoError] = useState('');
  const { address, status } = useReverseGeocode(gpsPosition);
  const selfId = deviceShortId(deviceId);
  const peerId = selfId === 'A' ? 'B' : 'A';

  useEffect(() => setSelected(deviceShortId(deviceId)), [deviceId]);

  useEffect(() => {
    if (!deviceId) return undefined;
    let cancelled = false;

    const loadLocations = async () => {
      try {
        const payload = await listLocations();
        if (cancelled) return;
        const byDevice = Object.fromEntries(
          (payload.items || [])
            .map((item) => [item.device_id, normalizeLocation(item)])
            .filter(([, location]) => Boolean(location))
        );
        const selfLocation = byDevice[deviceId];
        const peerLocation = byDevice[oppositeDevice(deviceId)];
        console.log('[GHOST MAP] API locations loaded', { selfLocation, peerLocation });
        if (selfLocation) setGpsPosition((current) => current || selfLocation);
        if (peerLocation) setPeerPosition(peerLocation);
      } catch (error) {
        console.log('[GHOST MAP] API location load failed', error);
      }
    };

    loadLocations();
    const id = window.setInterval(loadLocations, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [deviceId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('\u3053\u306e\u7aef\u672b\u3067\u306f\u4f4d\u7f6e\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093');
      console.log('[GHOST MAP] Geolocation is not available');
      return undefined;
    }
    setGeoStatus('loading');
    const watchId = navigator.geolocation.watchPosition(
      (next) => {
        const position = {
          lat: next.coords.latitude,
          lon: next.coords.longitude,
          accuracy: next.coords.accuracy,
          speed: next.coords.speed || 0,
          updatedAt: new Date(next.timestamp).toISOString(),
        };
        console.log('[GHOST MAP] GPS position received', position);
        setGpsPosition(position);
        setGpsHistory((current) => [position, ...current].slice(0, 5));
        setGeoStatus('ready');
        setGeoError('');
        if (deviceId && sendSocketMessage) {
          const sent = sendSocketMessage({
            type: 'heartbeat',
            payload: { lat: position.lat, lon: position.lon, timestamp: position.updatedAt },
          });
          console.log('[GHOST MAP] WebSocket heartbeat sent', { sent, deviceId, position });
        }
      },
      (error) => {
        setGeoStatus('error');
        setGeoError(error.message || '\u4f4d\u7f6e\u60c5\u5831\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f');
        console.log('[GHOST MAP] GPS error', { code: error.code, message: error.message });
      },
      geolocationOptions
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [deviceId, sendSocketMessage]);

  useEffect(() => {
    if (!socketMessage || !['location_update', 'device_online', 'device_offline'].includes(socketMessage.type)) return;
    if (socketMessage.type === 'device_offline' && socketMessage.device_id === oppositeDevice(deviceId)) {
      setPeerPosition((current) => (current ? { ...current, online: false, websocketOnline: false } : current));
      return;
    }
    const nextPosition = normalizeLocation(socketMessage.location);
    if (!nextPosition) {
      console.log('[GHOST MAP] Location message skipped', socketMessage);
      return;
    }
    console.log('[GHOST MAP] WebSocket location received', { deviceId: socketMessage.device_id, position: nextPosition });
    if (socketMessage.device_id === deviceId) {
      setGpsPosition((current) => current || nextPosition);
      return;
    }
    if (socketMessage.device_id === oppositeDevice(deviceId)) setPeerPosition(nextPosition);
  }, [deviceId, socketMessage]);

  useEffect(() => {
    const initialPosition = gpsPosition || peerPosition;
    if (!initialPosition || !mapElementRef.current || mapRef.current) return;
    const map = L.map(mapElementRef.current, { attributionControl: true, zoomControl: false }).setView([initialPosition.lat, initialPosition.lon], 17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors © CARTO' }).addTo(map);
    mapRef.current = map;
  }, [gpsPosition, peerPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !gpsPosition) return;
    if (!markerRefs.current.self) markerRefs.current.self = L.marker([gpsPosition.lat, gpsPosition.lon], { icon: createMarkerIcon('self', selfId) }).addTo(map);
    markerRefs.current.self.setIcon(createMarkerIcon('self', selfId));
    markerRefs.current.self.setLatLng([gpsPosition.lat, gpsPosition.lon]);
    map.setView([gpsPosition.lat, gpsPosition.lon], Math.max(map.getZoom(), 17));
  }, [gpsPosition, selfId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || gpsHistory.length < 2) return;
    const points = gpsHistory.slice().reverse().map((item) => [item.lat, item.lon]);
    if (!trailRef.current) {
      trailRef.current = L.polyline(points, { color: '#00e5b4', weight: 3, opacity: 0.72 }).addTo(map);
    } else {
      trailRef.current.setLatLngs(points);
    }
  }, [gpsHistory]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !peerPosition) return;
    if (!markerRefs.current.peer) markerRefs.current.peer = L.marker([peerPosition.lat, peerPosition.lon], { icon: createMarkerIcon('peer', peerId) }).addTo(map);
    markerRefs.current.peer.setIcon(createMarkerIcon('peer', peerId));
    markerRefs.current.peer.setLatLng([peerPosition.lat, peerPosition.lon]);
  }, [peerPosition, peerId]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    markerRefs.current = {};
    trailRef.current = null;
  }, []);

  const devices = useMemo(() => [
    { id: selfId, label: `${TERMINAL}${selfId}`, status: gpsPosition ? socketState : geoStatus, color: 'accent', position: gpsPosition, address: address || WAITING_ADDRESS, lastSeen: gpsPosition?.updatedAt || '\u672a\u53d6\u5f97' },
    { id: peerId, label: `${TERMINAL}${peerId}`, status: peerPosition?.online ? 'online' : 'offline', color: 'blue', position: peerPosition, address: peerPosition ? 'API/WebSocket\u3067\u4f4d\u7f6e\u53d7\u4fe1\u6e08\u307f' : '\u76f8\u624b\u7aef\u672b\u306e\u4f4d\u7f6e\u5f85\u6a5f\u4e2d', lastSeen: peerPosition?.updatedAt || NOT_RECEIVED },
  ], [address, geoStatus, gpsPosition, peerId, peerPosition, selfId, socketState]);

  const selectedDevice = devices.find((device) => device.id === selected) || devices[0];
  const selectedPosition = selectedDevice.position;
  const accuracyPercent = gpsPosition?.accuracy ? Math.max(8, Math.min(100, 100 - gpsPosition.accuracy)) : 8;
  const copyCoordinates = () => selectedPosition && navigator.clipboard?.writeText(formatCoords(selectedPosition));
  const openNavigation = () => selectedPosition && window.open(`https://maps.google.com/?q=${selectedPosition.lat},${selectedPosition.lon}`, '_blank');
  const centerCurrentLocation = () => gpsPosition && mapRef.current?.setView([gpsPosition.lat, gpsPosition.lon], 18);

  return (
    <section className="page-stack">
      <div className="map-header-row">
        <div>
          <h2>&#x4f4d;&#x7f6e;&#x76e3;&#x8996;</h2>
          <p className="muted">{TERMINAL}{selfId}: {statusJa(geoStatus)} / {TERMINAL}{peerId}: {peerPosition ? RECEIVING : NOT_RECEIVED}</p>
        </div>
        <div className="mode-switch">
          <button type="button" onClick={centerCurrentLocation}><Crosshair size={16} /> &#x73fe;&#x5728;&#x5730;</button>
        </div>
      </div>
      <div className="map-shell">
        <div ref={mapElementRef} className="map-canvas" />
        {!gpsPosition && !peerPosition && (
          <div className="map-empty-state">
            <strong>GPS&#x53d6;&#x5f97;&#x4e2d;</strong>
            <span>&#x7aef;&#x672b;&#x306e;&#x4f4d;&#x7f6e;&#x60c5;&#x5831;&#x8a31;&#x53ef;&#x3092;&#x78ba;&#x8a8d;&#x3057;&#x3066;&#x304f;&#x3060;&#x3055;&#x3044;</span>
          </div>
        )}
        <div className="map-grid-overlay" />
        <div className="map-distance">GPS&#x7cbe;&#x5ea6; {gpsPosition?.accuracy ? `${Math.round(gpsPosition.accuracy)}m` : '\u6e2c\u5b9a\u4e2d'}</div>
        <div className="map-provider">CartoDB Dark Matter</div>
      </div>
      <div className="wide-panel cyber-card">
        <div className="panel-title-row">
          <h2>GPS&#x7cbe;&#x5ea6;</h2>
          <span className="pill online">{gpsPosition?.accuracy ? `${Math.round(gpsPosition.accuracy)}m` : '\u6e2c\u5b9a\u4e2d'}</span>
        </div>
        <div className="bar-track"><span style={{ width: `${accuracyPercent}%` }} /></div>
        <p className="muted">&#x4f4f;&#x6240;API: &#x56fd;&#x571f;&#x5730;&#x7406;&#x9662; / 30&#x79d2;&#x30ad;&#x30e3;&#x30c3;&#x30b7;&#x30e5; / &#x8868;&#x793a;&#x306f;&#x4ed8;&#x8fd1;&#x8868;&#x8a18;</p>
      </div>
      <aside className="map-panel cyber-card">
        <div className="panel-title-row">
          <h2>{selectedDevice.label}</h2>
          <span className={`pill ${selectedDevice.status === 'online' || selectedDevice.status === 'ready' ? 'online' : 'warning'}`}>{statusJa(selectedDevice.status)}</span>
        </div>
        <p className="mono">{formatCoords(selectedPosition)}</p>
        <p>{selectedDevice.address}</p>
        <p className="muted">&#x4f4f;&#x6240;&#x53d6;&#x5f97;: {statusJa(status)} / &#x6700;&#x7d42;&#x78ba;&#x8a8d;: {selectedDevice.lastSeen}{geoError ? ` / ${geoError}` : ''}</p>
        <div className="button-row">
          <button type="button" onClick={copyCoordinates} disabled={!selectedPosition}><Copy size={16} /> 📋 &#x5ea7;&#x6a19;&#x30b3;&#x30d4;&#x30fc;</button>
          <button type="button" onClick={openNavigation} disabled={!selectedPosition}><Navigation size={16} /> &#x30ca;&#x30d3;</button>
        </div>
      </aside>
      {devices.map((device) => (
        <button className={selected === device.id ? 'device-card selected' : 'device-card'} key={device.id} type="button" onClick={() => setSelected(device.id)}>
          <span className={`device-dot ${device.color}`} />
          <strong>{device.label}</strong>
          <span>{device.position ? formatCoords(device.position) : device.address}</span>
          <em>{statusJa(device.status)}</em>
        </button>
      ))}
      <div className="wide-panel cyber-card">
        <h2>GPS&#x5c65;&#x6b74;</h2>
        {gpsHistory.length === 0 ? (
          <p className="muted">&#x5c65;&#x6b74;&#x306a;&#x3057;</p>
        ) : gpsHistory.map((item) => (
          <div className="feed-row" key={`${item.updatedAt}-${item.lat}`}>
            <span>{new Date(item.updatedAt).toLocaleTimeString('ja-JP')} / {formatCoords(item)}</span>
            <strong>{item.accuracy ? `${Math.round(item.accuracy)}m` : '-'}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
