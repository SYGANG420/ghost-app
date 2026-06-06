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
            <span>{labels[activeTab]} / 保護中</span>
          </div>
        </div>
      </div>
      <div className="header-status">
        <span className="status-chip">
          <Shield size={16} />
          {deviceId || '端末未設定'}
        </span>
        <span className={online ? 'status-chip online' : 'status-chip offline'}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          通信 {statusJa(socketState)}
        </span>
      </div>
    </header>
  );
}
