import { Lock, Power, ShieldAlert, TimerReset } from 'lucide-react';

export default function CtrlPage({ onLock, socketState }) {
  return (
    <section className="ctrl-grid">
      <button className="control-tile danger" type="button">
        <ShieldAlert size={24} />
        <span>REMOTE WIPE</span>
        <strong>ARMED</strong>
      </button>
      <button className="control-tile" type="button">
        <TimerReset size={24} />
        <span>DEAD MAN SWITCH</span>
        <strong>72H</strong>
      </button>
      <button className="control-tile" type="button">
        <Power size={24} />
        <span>VPN STATE</span>
        <strong>{socketState === 'online' ? 'LINKED' : 'UNKNOWN'}</strong>
      </button>
      <button className="control-tile lock" type="button" onClick={onLock}>
        <Lock size={24} />
        <span>電卓に戻る</span>
        <strong>LOCK NOW</strong>
      </button>
    </section>
  );
}
