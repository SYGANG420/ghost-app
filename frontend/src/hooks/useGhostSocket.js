import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WS_BASE_URL } from '../api/client.js';

const READY_STATE_LABELS = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
};

const RETRY_DELAY_MS = 10_000;
const PING_INTERVAL_MS = 15_000;
const PONG_STALE_MS = 35_000;

function nowIso() {
  return new Date().toISOString();
}

function initialDiagnostics(token) {
  return {
    tokenStatus: token ? (token.startsWith('dev.') ? 'dev_token' : 'jwt_ready') : 'missing',
    url: '',
    readyState: null,
    readyStateLabel: 'NO_SOCKET',
    openedAt: '',
    closedAt: '',
    lastMessageAt: '',
    lastHeartbeatAt: '',
    lastPongAt: '',
    serverTime: '',
    lastErrorAt: '',
    lastCloseCode: '',
    lastCloseReason: '',
    lastSendFailureAt: '',
    sendFailures: 0,
    retryDelayMs: RETRY_DELAY_MS,
    nextRetryAt: '',
    reconnects: 0,
  };
}

export function useGhostSocket(deviceId, token) {
  const socketRef = useRef(null);
  const openedRef = useRef(false);
  const retryTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [state, setState] = useState('offline');
  const [lastMessage, setLastMessage] = useState(null);
  const [diagnostics, setDiagnostics] = useState(() => initialDiagnostics(token));

  const reconnect = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setDiagnostics((current) => ({ ...current, nextRetryAt: '', reconnects: current.reconnects + 1 }));
    setReconnectNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!deviceId || !token) {
      setState('offline');
      setDiagnostics(initialDiagnostics(token));
      return undefined;
    }

    const url = `${WS_BASE_URL}/${encodeURIComponent(deviceId)}/${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;
    openedRef.current = false;

    const scheduleReconnect = () => {
      if (retryTimerRef.current || !deviceId || !token) return;
      const nextRetryAt = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
      setDiagnostics((current) => ({ ...current, retryDelayMs: RETRY_DELAY_MS, nextRetryAt }));
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setReconnectNonce((current) => current + 1);
      }, RETRY_DELAY_MS);
    };

    const sendPing = () => {
      if (socketRef.current !== socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: 'ping', client_time: nowIso() }));
      setDiagnostics((current) => {
        const lastPongAt = current.lastPongAt ? new Date(current.lastPongAt).getTime() : 0;
        if (lastPongAt && Date.now() - lastPongAt > PONG_STALE_MS) {
          setState('error');
        }
        return current;
      });
    };

    setState('connecting');
    setDiagnostics({
      ...initialDiagnostics(token),
      url: `${WS_BASE_URL}/${encodeURIComponent(deviceId)}/[token]`,
      readyState: socket.readyState,
      readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
    });

    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) return;
      openedRef.current = true;
      setState('connecting');
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        openedAt: nowIso(),
        closedAt: '',
        lastErrorAt: '',
        lastCloseCode: '',
        lastCloseReason: '',
        nextRetryAt: '',
      }));
      sendPing();
      pingTimerRef.current = window.setInterval(sendPing, PING_INTERVAL_MS);
    });
    socket.addEventListener('message', (event) => {
      if (socketRef.current !== socket) return;
      try {
        const parsed = JSON.parse(event.data);
        setLastMessage(parsed);
        if (parsed.type === 'pong') {
          setState('online');
          setDiagnostics((current) => ({
            ...current,
            lastPongAt: nowIso(),
            serverTime: parsed.server_time || '',
          }));
        }
      } catch {
        setLastMessage({ raw: event.data });
      }
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        lastMessageAt: nowIso(),
      }));
    });
    socket.addEventListener('close', (event) => {
      if (socketRef.current !== socket) return;
      openedRef.current = false;
      if (pingTimerRef.current) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      setState('offline');
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        closedAt: nowIso(),
        lastCloseCode: event.code || '',
        lastCloseReason: event.reason || '',
      }));
      scheduleReconnect();
    });
    socket.addEventListener('error', () => {
      if (socketRef.current !== socket) return;
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        lastErrorAt: nowIso(),
      }));
      if (!openedRef.current) {
        setState('error');
        scheduleReconnect();
      }
    });

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (pingTimerRef.current) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (socketRef.current !== socket) return;
      socketRef.current = null;
      socket.close();
    };
  }, [deviceId, reconnectNonce, token]);

  const sendJson = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log('[GHOST MAP] WebSocket send skipped', { readyState: socket?.readyState, payload });
      setDiagnostics((current) => ({
        ...current,
        readyState: socket?.readyState ?? null,
        readyStateLabel: READY_STATE_LABELS[socket?.readyState] || 'NO_SOCKET',
        lastSendFailureAt: nowIso(),
        sendFailures: current.sendFailures + 1,
      }));
      return false;
    }

    socket.send(JSON.stringify(payload));
    if (payload?.type === 'heartbeat') {
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        lastHeartbeatAt: nowIso(),
      }));
    }
    return true;
  }, []);

  return useMemo(
    () => ({ state, lastMessage, sendJson, diagnostics, reconnect }),
    [state, lastMessage, sendJson, diagnostics, reconnect]
  );
}
