import { Activity, AlertTriangle, Clock, KeyRound, RadioTower, Wifi } from 'lucide-react';
import { statusJa } from '../utils/format.js';

const TEXT = {
  title: '\u901a\u4fe1\u8a3a\u65ad',
  auth: '\u8a8d\u8a3c',
  token: 'JWT',
  ws: 'WebSocket',
  readyState: '\u72b6\u614b\u30b3\u30fc\u30c9',
  url: '\u63a5\u7d9a\u5148',
  opened: '\u6700\u5f8c\u306eopen',
  heartbeat: '\u6700\u5f8c\u306eheartbeat',
  message: '\u6700\u5f8c\u306e\u53d7\u4fe1',
  closed: '\u6700\u5f8c\u306eclose',
  error: '\u6700\u5f8c\u306eerror',
  closeReason: 'close\u7406\u7531',
  sendFailures: '\u9001\u4fe1\u5931\u6557',
  none: '-',
  jwtReady: '\u53d6\u5f97\u6e08\u307f',
  devToken: '\u4eee\u30c8\u30fc\u30af\u30f3',
  missing: '\u672a\u53d6\u5f97',
};

function tokenStatusJa(status) {
  if (status === 'jwt_ready') return TEXT.jwtReady;
  if (status === 'dev_token') return TEXT.devToken;
  return TEXT.missing;
}

function formatTime(value) {
  if (!value) return TEXT.none;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function DiagnosticRow({ label, value }) {
  return (
    <div className="diagnostic-row">
      <span>{label}</span>
      <strong>{value || TEXT.none}</strong>
    </div>
  );
}

export default function WebSocketDiagnostics({ authStatus, authError, socketState, diagnostics = {} }) {
  const closeText = diagnostics.lastCloseCode
    ? `${diagnostics.lastCloseCode} ${diagnostics.lastCloseReason || TEXT.none}`
    : TEXT.none;

  return (
    <div className="wide-panel cyber-card ws-diagnostics">
      <div className="panel-title-row">
        <h2>{TEXT.title}</h2>
        <span className={socketState === 'online' ? 'status-chip online' : 'status-chip offline'}>
          {socketState === 'online' ? <Wifi size={14} /> : <AlertTriangle size={14} />}
          {statusJa(socketState)}
        </span>
      </div>
      <div className="diagnostic-grid">
        <DiagnosticRow label={<><KeyRound size={13} /> {TEXT.token}</>} value={tokenStatusJa(diagnostics.tokenStatus)} />
        <DiagnosticRow label={<><Activity size={13} /> {TEXT.auth}</>} value={authError || statusJa(authStatus)} />
        <DiagnosticRow label={<><RadioTower size={13} /> {TEXT.ws}</>} value={statusJa(socketState)} />
        <DiagnosticRow label={TEXT.readyState} value={diagnostics.readyStateLabel} />
        <DiagnosticRow label={TEXT.url} value={diagnostics.url} />
        <DiagnosticRow label={<><Clock size={13} /> {TEXT.opened}</>} value={formatTime(diagnostics.openedAt)} />
        <DiagnosticRow label={TEXT.heartbeat} value={formatTime(diagnostics.lastHeartbeatAt)} />
        <DiagnosticRow label={TEXT.message} value={formatTime(diagnostics.lastMessageAt)} />
        <DiagnosticRow label={TEXT.closed} value={formatTime(diagnostics.closedAt)} />
        <DiagnosticRow label={TEXT.error} value={formatTime(diagnostics.lastErrorAt)} />
        <DiagnosticRow label={TEXT.closeReason} value={closeText} />
        <DiagnosticRow label={TEXT.sendFailures} value={`${diagnostics.sendFailures || 0}`} />
      </div>
    </div>
  );
}
