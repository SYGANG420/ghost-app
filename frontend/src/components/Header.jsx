import { RadioTower, Shield, Wifi, WifiOff } from 'lucide-react';
import { statusJa } from '../utils/format.js';

const labels = {
  HOME: 'ホーム',
  MAP: '地図',
  SALES: '売上',
  STOCK: '在庫',
  KPI: '実績',
  CTRL: '制御',
};

export default function Header({ activeTab, deviceId, socketState }) {
  const online = socketState === 'online';

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark">GC</div>
        <div>
          <div className="brand-title">ゴーストコントロール</div>
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
        <span className="status-chip">
          <RadioTower size={16} />
          通信
        </span>
      </div>
    </header>
  );
}
