import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Copy, Crosshair, Navigation } from 'lucide-react';
import { useReverseGeocode } from '../hooks/useReverseGeocode.js';
import { statusJa } from '../utils/format.js';

const geolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

function deviceShortId(deviceId) {
  return deviceId === 'device_b' ? 'B' : 'A';
}

function oppositeDevice(deviceId) {
  return deviceId === 'device_b' ? 'device_a' : 'device_b';
}

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    lat,
    lon,
    battery: location.battery ?? null,
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
  if (!position) return 'GPS取得待機中';
  return `${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`;
}

export default function MapPage({ socketState, socketMessage, sendSocketMessage, deviceId }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const [selected, setSelected] = useState(deviceShortId(deviceId));
  const [gpsPosition, setGpsPosition] = useState(null);
  const [peerPosition, setPeerPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoError, setGeoError] = useState('');
  const { address, status } = useReverseGeocode(gpsPosition);

  const selfId = deviceShortId(deviceId);
  const peerId = selfId === 'A' ? 'B' : 'A';

  useEffect(() => {
    setSelected(deviceShortId(deviceId));
  }, [deviceId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('この端末では位置情報を取得できません');
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
        setGeoStatus('ready');
        setGeoError('');

        if (deviceId && sendSocketMessage) {
          const sent = sendSocketMessage({
            type: 'heartbeat',
            lat: position.lat,
            lon: position.lon,
            timestamp: position.updatedAt,
          });
          console.log('[GHOST MAP] WebSocket heartbeat sent', { sent, deviceId, position });
        }
      },
      (error) => {
        setGeoStatus('error');
        setGeoError(error.message || '位置情報の取得に失敗しました');
        console.log('[GHOST MAP] GPS error', {
          code: error.code,
          message: error.message,
        });
      },
      geolocationOptions
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [deviceId, sendSocketMessage]);

  useEffect(() => {
    if (!socketMessage || !['location_update', 'device_online'].includes(socketMessage.type)) {
      return;
    }

    const nextPosition = normalizeLocation(socketMessage.location);
    if (!nextPosition) {
      console.log('[GHOST MAP] Location message skipped', socketMessage);
      return;
    }

    console.log('[GHOST MAP] WebSocket location received', {
      deviceId: socketMessage.device_id,
      position: nextPosition,
    });

    if (socketMessage.device_id === deviceId) {
      setGpsPosition((current) => current || nextPosition);
      return;
    }

    if (socketMessage.device_id === oppositeDevice(deviceId)) {
      setPeerPosition(nextPosition);
    }
  }, [deviceId, socketMessage]);

  useEffect(() => {
    const initialPosition = gpsPosition || peerPosition;
    if (!initialPosition || !mapElementRef.current) {
      return;
    }

    if (!mapRef.current) {
      const map = L.map(mapElementRef.current, { attributionControl: true, zoomControl: false }).setView(
        [initialPosition.lat, initialPosition.lon],
        17
      );
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
      }).addTo(map);
      mapRef.current = map;
    }
  }, [gpsPosition, peerPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !gpsPosition) return;

    if (!markerRefs.current.self) {
      markerRefs.current.self = L.marker([gpsPosition.lat, gpsPosition.lon], {
        icon: createMarkerIcon('self', selfId),
      }).addTo(map);
    }

    markerRefs.current.self.setIcon(createMarkerIcon('self', selfId));
    markerRefs.current.self.setLatLng([gpsPosition.lat, gpsPosition.lon]);
    map.setView([gpsPosition.lat, gpsPosition.lon], Math.max(map.getZoom(), 17));
    console.log('[GHOST MAP] Self marker updated', gpsPosition);
  }, [gpsPosition, selfId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !peerPosition) return;

    if (!markerRefs.current.peer) {
      markerRefs.current.peer = L.marker([peerPosition.lat, peerPosition.lon], {
        icon: createMarkerIcon('peer', peerId),
      }).addTo(map);
    }

    markerRefs.current.peer.setIcon(createMarkerIcon('peer', peerId));
    markerRefs.current.peer.setLatLng([peerPosition.lat, peerPosition.lon]);
    console.log('[GHOST MAP] Peer marker updated', peerPosition);
  }, [peerPosition, peerId]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    markerRefs.current = {};
  }, []);

  const devices = useMemo(
    () => [
      {
        id: selfId,
        label: `端末${selfId}`,
        status: gpsPosition ? socketState : geoStatus,
        color: 'accent',
        position: gpsPosition,
        address: address || '住所取得待機中',
        lastSeen: gpsPosition?.updatedAt || '未取得',
      },
      {
        id: peerId,
        label: `端末${peerId}`,
        status: peerPosition ? 'online' : 'offline',
        color: 'blue',
        position: peerPosition,
        address: peerPosition ? 'WebSocketで位置受信済み' : '相手端末の位置待機中',
        lastSeen: peerPosition?.updatedAt || '未受信',
      },
    ],
    [address, geoStatus, gpsPosition, peerId, peerPosition, selfId, socketState]
  );

  const selectedDevice = devices.find((device) => device.id === selected) || devices[0];
  const selectedPosition = selectedDevice.position;
  const copyAddress = () => navigator.clipboard?.writeText(selectedDevice.address);
  const openNavigation = () => {
    if (!selectedPosition) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPosition.lat},${selectedPosition.lon}`, '_blank');
  };
  const centerCurrentLocation = () => {
    if (!mapRef.current || !gpsPosition) return;
    mapRef.current.setView([gpsPosition.lat, gpsPosition.lon], 18);
  };

  return (
    <section className="page-stack">
      <div className="map-header-row">
        <div>
          <h2>位置監視</h2>
          <p className="muted">
            端末{selfId}: {statusJa(geoStatus)} / 端末{peerId}: {peerPosition ? '受信中' : '未受信'}
          </p>
        </div>
        <div className="mode-switch">
          <button type="button" onClick={centerCurrentLocation}>
            <Crosshair size={16} /> 現在地
          </button>
        </div>
      </div>

      <div className="map-shell">
        <div ref={mapElementRef} className="map-canvas" />
        {!gpsPosition && !peerPosition && (
          <div className="map-empty-state">
            <strong>GPS取得中</strong>
            <span>端末の位置情報許可を確認してください</span>
          </div>
        )}
        <div className="map-grid-overlay" />
        <div className="map-distance">GPS精度 {gpsPosition?.accuracy ? `${Math.round(gpsPosition.accuracy)}m` : '測定中'}</div>
        <div className="map-provider">CartoDB Dark Matter</div>
      </div>

      <aside className="map-panel cyber-card">
        <div className="panel-title-row">
          <h2>{selectedDevice.label}</h2>
          <span className={`pill ${selectedDevice.status === 'online' || selectedDevice.status === 'ready' ? 'online' : 'warning'}`}>
            {statusJa(selectedDevice.status)}
          </span>
        </div>
        <p className="mono">{formatCoords(selectedPosition)}</p>
        <p>{selectedDevice.address}</p>
        <p className="muted">
          住所取得: {statusJa(status)} / 最終確認: {selectedDevice.lastSeen}
          {geoError ? ` / ${geoError}` : ''}
        </p>
        <div className="button-row">
          <button type="button" onClick={copyAddress} disabled={!selectedDevice.address}>
            <Copy size={16} /> コピー
          </button>
          <button type="button" onClick={openNavigation} disabled={!selectedPosition}>
            <Navigation size={16} /> ナビ
          </button>
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
    </section>
  );
}
