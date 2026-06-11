import { useState } from 'react';
import { Lock, ServerCrash, ShieldAlert, Trash2 } from 'lucide-react';
import NativeLocationPanel from '../components/NativeLocationPanel.jsx';
import WebSocketDiagnostics from '../components/WebSocketDiagnostics.jsx';
import { getWipeConfirmToken, requestRemoteWipe, requestVpsWipe, updateDeadManSwitch } from '../api/wipe.js';

export default function CtrlPage({
  onLock,
  deviceId,
  socketState,
  socketDiagnostics,
  authStatus,
  authError,
  onRefreshToken,
  onReconnectSocket,
  onExportData,
  onResetLocalData,
  onResetDevice,
  nativeLocation,
}) {
  const [deadmanEnabled, setDeadmanEnabled] = useState(false);
  const [deadmanHours, setDeadmanHours] = useState(72);
  const [lastAction, setLastAction] = useState('\u5f85\u6a5f\u4e2d');
  const isAdmin = deviceId === 'device_a';

  const fetchConfirmToken = async (kind) => {
    const payload = await getWipeConfirmToken(kind);
    if (!payload?.confirmation_token) {
      throw new Error('Confirmation token missing');
    }
    return payload.confirmation_token;
  };

  const confirmAction = async (action) => {
    if (!isAdmin) return;
    const ok = window.confirm(`${action.label}\u3092\u5b9f\u884c\u3057\u307e\u3059\u3002\n\u5b9f\u884c\u8005: ${deviceId}\n\u5bfe\u8c61: ${action.target || action.kind}\n\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f`);
    if (!ok) {
      setLastAction('\u30ad\u30e3\u30f3\u30bb\u30eb');
      return;
    }
    const phrase = window.prompt('\u6700\u7d42\u78ba\u8a8d: \u5b9f\u884c\u3059\u308b\u5834\u5408\u306f\u300c\u5b9f\u884c\u300d\u3068\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044');
    if (phrase !== '\u5b9f\u884c') {
      setLastAction('\u6700\u7d42\u78ba\u8a8d\u3067\u4e2d\u6b62');
      return;
    }
    try {
      setLastAction('\u78ba\u8a8d\u30c8\u30fc\u30af\u30f3\u53d6\u5f97\u4e2d');
      if (action.kind === 'all') {
        const [deviceToken, vpsToken] = await Promise.all([
          fetchConfirmToken('device'),
          fetchConfirmToken('vps'),
        ]);
        setLastAction('\u9001\u4fe1\u4e2d');
        await Promise.all([
          requestRemoteWipe('device_a', { reason: 'all_wipe', confirmation_token: deviceToken }),
          requestRemoteWipe('device_b', { reason: 'all_wipe', confirmation_token: deviceToken }),
          requestVpsWipe({ reason: 'all_wipe', confirmation_token: vpsToken }),
        ]);
      } else if (action.kind === 'vps') {
        const confirmationToken = await fetchConfirmToken('vps');
        setLastAction('\u9001\u4fe1\u4e2d');
        await requestVpsWipe({ reason: action.label, confirmation_token: confirmationToken });
      } else {
        const confirmationToken = await fetchConfirmToken('device');
        setLastAction('\u9001\u4fe1\u4e2d');
        await requestRemoteWipe(action.target, { reason: action.label, confirmation_token: confirmationToken });
      }
      setLastAction(`${action.label} \u30d5\u30e9\u30b0\u767b\u9332`);
    } catch (error) {
      console.log('[GHOST CTRL] Wipe request failed', error);
      setLastAction('\u9001\u4fe1\u30a8\u30e9\u30fc');
    }
  };

  const wipeActions = [
    { label: '\u7aef\u672bA \u30ef\u30a4\u30d7', icon: ShieldAlert, kind: 'device', target: 'device_a' },
    { label: '\u7aef\u672bB \u30ef\u30a4\u30d7', icon: ShieldAlert, kind: 'device', target: 'device_b' },
    { label: 'VPS\u6d88\u53bb', icon: ServerCrash, kind: 'vps' },
    { label: '\u5168\u6d88\u53bb', icon: Trash2, kind: 'all' },
  ];

  const saveDeadman = async (enabled, hours = deadmanHours) => {
    setDeadmanEnabled(enabled);
    setDeadmanHours(hours);
    try {
      await updateDeadManSwitch(deviceId, { enabled, hours });
      setLastAction('\u30c7\u30c3\u30c9\u30de\u30f3\u8a2d\u5b9a\u4fdd\u5b58');
    } catch (error) {
      console.log('[GHOST CTRL] Deadman save failed', error);
      setLastAction('\u30c7\u30c3\u30c9\u30de\u30f3\u4fdd\u5b58\u5931\u6557');
    }
  };

  return (
    <section className="page-stack">
      <div className="alert-strip">
        <span className={isAdmin ? 'signal-dot' : 'signal-dot red'} />
        <strong>{isAdmin ? 'ADMIN\u6a29\u9650' : 'USER\u6a29\u9650'}</strong>
        <span>{lastAction}</span>
      </div>

      <WebSocketDiagnostics
        authError={authError}
        authStatus={authStatus}
        diagnostics={socketDiagnostics}
        onReconnect={onReconnectSocket}
        onRefreshToken={onRefreshToken}
        socketState={socketState}
      />

      <NativeLocationPanel nativeLocation={nativeLocation} />

      <div className="ctrl-grid">
        {wipeActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className="control-tile danger"
              disabled={!isAdmin}
              key={action.label}
              type="button"
              onClick={() => confirmAction(action)}
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
            <input type="checkbox" checked={deadmanEnabled} onChange={(event) => saveDeadman(event.target.checked)} />
            {deadmanEnabled ? 'ON' : 'OFF'}
          </label>
        </div>
        <div className="segmented-row">
          {[24, 48, 72].map((hours) => (
            <button className={deadmanHours === hours ? 'active' : ''} key={hours} type="button" onClick={() => saveDeadman(deadmanEnabled, hours)}>
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

      <div className="wide-panel cyber-card">
        <h2>&#x30ed;&#x30fc;&#x30ab;&#x30eb;&#x30c7;&#x30fc;&#x30bf;</h2>
        <div className="button-row">
          <button type="button" onClick={onExportData}>&#x30a8;&#x30af;&#x30b9;&#x30dd;&#x30fc;&#x30c8;</button>
          <button className="danger-button" type="button" onClick={onResetLocalData}>&#x7aef;&#x672b;&#x30c7;&#x30fc;&#x30bf;&#x521d;&#x671f;&#x5316;</button>
          <button type="button" onClick={onResetDevice}>&#x7aef;&#x672b;&#x8a2d;&#x5b9a;&#x3092;&#x518d;&#x9078;&#x629e;</button>
        </div>
      </div>
    </section>
  );
}
