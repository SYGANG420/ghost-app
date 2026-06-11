import { MapPin, Play, Square, ShieldCheck } from 'lucide-react';

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ja-JP');
}

export default function NativeLocationPanel({ nativeLocation }) {
  const { status, busy, chooseCertificate, start, stop } = nativeLocation;

  if (!status.available) {
    return (
      <div className="wide-panel cyber-card">
        <div className="panel-title-row">
          <h2>Android\u5e38\u99d0GPS</h2>
          <span className="pill warning">PWA</span>
        </div>
        <p className="muted">APK\u7248\u3067\u306e\u307f\u3001\u30a2\u30d7\u30ea\u3092\u9589\u3058\u305f\u5f8c\u306e\u4f4d\u7f6e\u9001\u4fe1\u3092\u6709\u52b9\u5316\u3067\u304d\u307e\u3059\u3002</p>
      </div>
    );
  }

  return (
    <div className="wide-panel cyber-card">
      <div className="panel-title-row">
        <h2>Android\u5e38\u99d0GPS</h2>
        <span className={status.running ? 'pill online' : 'pill warning'}>{status.running ? '\u9001\u4fe1\u4e2d' : '\u505c\u6b62\u4e2d'}</span>
      </div>
      <div className="feed-row">
        <span>\u7aef\u672b\u8a3c\u660e\u66f8</span>
        <strong>{status.certificateAlias || '\u672a\u9078\u629e'}</strong>
      </div>
      <div className="feed-row">
        <span>\u6700\u7d42\u9001\u4fe1</span>
        <strong>{formatTime(status.lastSentAt)}</strong>
      </div>
      {status.lastError && (
        <div className="alert-strip danger-inline">
          <span className="signal-dot red" />
          <strong>{status.lastError}</strong>
        </div>
      )}
      <div className="button-row">
        <button type="button" onClick={chooseCertificate} disabled={busy}>
          <ShieldCheck size={16} /> \u8a3c\u660e\u66f8\u9078\u629e
        </button>
        <button type="button" onClick={start} disabled={busy || !status.certificateAlias}>
          <Play size={16} /> \u5e38\u99d0\u958b\u59cb
        </button>
        <button type="button" onClick={stop} disabled={busy || !status.running}>
          <Square size={16} /> \u505c\u6b62
        </button>
      </div>
      <p className="muted"><MapPin size={14} /> Foreground Service\u306730\u79d2\u3054\u3068\u306bGPS heartbeat\u3092\u9001\u4fe1\u3057\u307e\u3059\u3002</p>
    </div>
  );
}
