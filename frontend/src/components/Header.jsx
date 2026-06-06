import { RadioTower, Shield, Wifi, WifiOff } from 'lucide-react';

export default function Header({ activeTab, deviceId, socketState }) {
  const online = socketState === 'online';

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">GHOST CONTROL</p>
        <h1>{activeTab}</h1>
      </div>
      <div className="header-status">
        <span className="status-chip">
          <Shield size={16} />
          {deviceId || 'NO_DEVICE'}
        </span>
        <span className={online ? 'status-chip online' : 'status-chip offline'}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          WS {socketState.toUpperCase()}
        </span>
        <span className="status-chip">
          <RadioTower size={16} />
          API /api
        </span>
      </div>
    </header>
  );
}
