import { useState } from 'react';
import { Lock, ServerCrash, ShieldAlert, Trash2 } from 'lucide-react';

export default function CtrlPage({ onLock, deviceId }) {
  const [deadmanEnabled, setDeadmanEnabled] = useState(false);
  const [deadmanHours, setDeadmanHours] = useState(72);
  const [lastAction, setLastAction] = useState('\u5f85\u6a5f\u4e2d');
  const isAdmin = deviceId === 'device_a';

  const confirmAction = (label) => {
    if (!isAdmin) return;
    const ok = window.confirm(`${label}\u3092\u5b9f\u884c\u3057\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f`);
    setLastAction(ok ? `${label} \u5b9f\u884c\u30d5\u30e9\u30b0\u767b\u9332` : '\u30ad\u30e3\u30f3\u30bb\u30eb');
  };

  const wipeActions = [
    { label: '\u7aef\u672bA \u30ef\u30a4\u30d7', icon: ShieldAlert },
    { label: '\u7aef\u672bB \u30ef\u30a4\u30d7', icon: ShieldAlert },
    { label: 'VPS\u6d88\u53bb', icon: ServerCrash },
    { label: '\u5168\u6d88\u53bb', icon: Trash2 },
  ];

  return (
    <section className="page-stack">
      <div className="alert-strip">
        <span className={isAdmin ? 'signal-dot' : 'signal-dot red'} />
        <strong>{isAdmin ? 'ADMIN\u6a29\u9650' : 'USER\u6a29\u9650'}</strong>
        <span>{lastAction}</span>
      </div>

      <div className="ctrl-grid">
        {wipeActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className="control-tile danger"
              disabled={!isAdmin}
              key={action.label}
              type="button"
              onClick={() => confirmAction(action.label)}
            >
              <Icon size={24} />
              <span>{action.label}</span>
              <strong>{isAdmin ? '\u78ba\u8a8d\u3057\u3066\u5b9f\u884c' : 'ADMIN\u5c02\u7528'}</strong>
            </button>
          );
        })}
      </div>

      <div className="wide-panel cyber-card">
        <div className="panel-title-row">
          <h2>&#x30c7;&#x30c3;&#x30c9;&#x30de;&#x30f3;&#x30ba;&#x30b9;&#x30a4;&#x30c3;&#x30c1;</h2>
          <label className="toggle-row">
            <input type="checkbox" checked={deadmanEnabled} onChange={(event) => setDeadmanEnabled(event.target.checked)} />
            {deadmanEnabled ? 'ON' : 'OFF'}
          </label>
        </div>
        <div className="segmented-row">
          {[24, 48, 72].map((hours) => (
            <button className={deadmanHours === hours ? 'active' : ''} key={hours} type="button" onClick={() => setDeadmanHours(hours)}>
              {hours}&#x6642;&#x9593;
            </button>
          ))}
        </div>
        <p className="muted">
          &#x72b6;&#x614b;: {deadmanEnabled ? `${deadmanHours}\u6642\u9593\u3067\u76e3\u8996\u4e2d` : '\u505c\u6b62\u4e2d'}
        </p>
      </div>

      <button className="control-tile lock full-width-action" type="button" onClick={onLock}>
        <Lock size={24} />
        <span>&#x96fb;&#x5353;&#x3078;&#x623b;&#x308b;</span>
        <strong>&#x5373;&#x6642;&#x30ed;&#x30c3;&#x30af;</strong>
      </button>
    </section>
  );
}
