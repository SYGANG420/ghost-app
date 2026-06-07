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
  pong: '\u6700\u5f8c\u306epong',
  serverTime: '\u30b5\u30fc\u30d0\u6642\u523b',
  message: '\u6700\u5f8c\u306e\u53d7\u4fe1',
  closed: '\u6700\u5f8c\u306eclose',
  error: '\u6700\u5f8c\u306eerror',
  closeReason: 'close\u7406\u7531',
  sendFailures: '\u9001\u4fe1\u5931\u6557',
  nextRetry: '\u6b21\u56de\u518d\u63a5\u7d9a',
  retryDelay: '\u518d\u63a5\u7d9a\u9593\u9694',
  reconnects: '\u624b\u52d5\u518d\u63a5\u7d9a',
  refreshJwt: 'JWT\u518d\u53d6\u5f97',
  reconnectNow: 'WS\u518d\u63a5\u7d9a',
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

export default function WebSocketDiagnostics({ authStatus, authError, socketState, diagnostics = {}, onRefreshToken, onReconnect }) {
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
        <DiagnosticRow label={TEXT.pong} value={formatTime(diagnostics.lastPongAt)} />
        <DiagnosticRow label={TEXT.serverTime} value={formatTime(diagnostics.serverTime)} />
        <DiagnosticRow label={TEXT.message} value={formatTime(diagnostics.lastMessageAt)} />
        <DiagnosticRow label={TEXT.closed} value={formatTime(diagnostics.closedAt)} />
        <DiagnosticRow label={TEXT.error} value={formatTime(diagnostics.lastErrorAt)} />
        <DiagnosticRow label={TEXT.closeReason} value={closeText} />
        <DiagnosticRow label={TEXT.sendFailures} value={`${diagnostics.sendFailures || 0}`} />
        <DiagnosticRow label={TEXT.retryDelay} value={`${Math.round((diagnostics.retryDelayMs || 0) / 1000)}\u79d2`} />
        <DiagnosticRow label={TEXT.nextRetry} value={formatTime(diagnostics.nextRetryAt)} />
        <DiagnosticRow label={TEXT.reconnects} value={`${diagnostics.reconnects || 0}`} />
      </div>
      <div className="button-row">
        <button type="button" onClick={onRefreshToken}>{TEXT.refreshJwt}</button>
        <button type="button" onClick={onReconnect}>{TEXT.reconnectNow}</button>
      </div>
    </div>
  );
}
