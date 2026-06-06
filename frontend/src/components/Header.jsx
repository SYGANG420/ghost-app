import { Shield, Wifi, WifiOff } from 'lucide-react';
import { statusJa } from '../utils/format.js';

const labels = {
  HOME: 'HOME',
  MAP: 'MAP',
  SALES: 'SALES',
  STOCK: 'STOCK',
  KPI: 'KPI',
  CTRL: 'CTRL',
};

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
            <span>{labels[activeTab]} / &#x4fdd;&#x8b77;&#x4e2d;</span>
          </div>
        </div>
      </div>
      <div className="header-status">
        <span className="status-chip">
          <Shield size={16} />
          {deviceId || '\u7aef\u672b\u672a\u8a2d\u5b9a'}
        </span>
        <span className={online ? 'status-chip online' : 'status-chip offline'}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          &#x901a;&#x4fe1; {statusJa(socketState)}
        </span>
      </div>
    </header>
  );
}
