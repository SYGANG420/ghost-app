import { RadioTower, Shield, Wifi, WifiOff } from 'lucide-react';

export default function Header({ activeTab, deviceId, socketState }) {
  const online = socketState === 'online';

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark">GC</div>
        <div>
          <div className="brand-title">GHOST CONTROL</div>
          <div className="brand-subline">
            <span className="signal-dot" />
            <span>{activeTab} / SECURED</span>
          </div>
        </div>
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
          API
        </span>
      </div>
    </header>
  );
}
