import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WS_BASE_URL } from '../api/client.js';

const READY_STATE_LABELS = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
};

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
    lastErrorAt: '',
    lastCloseCode: '',
    lastCloseReason: '',
    lastSendFailureAt: '',
    sendFailures: 0,
  };
}

export function useGhostSocket(deviceId, token) {
  const socketRef = useRef(null);
  const openedRef = useRef(false);
  const [state, setState] = useState('offline');
  const [lastMessage, setLastMessage] = useState(null);
  const [diagnostics, setDiagnostics] = useState(() => initialDiagnostics(token));

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
      setState('online');
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        openedAt: nowIso(),
        closedAt: '',
        lastErrorAt: '',
        lastCloseCode: '',
        lastCloseReason: '',
      }));
    });
    socket.addEventListener('message', (event) => {
      if (socketRef.current !== socket) return;
      try {
        setLastMessage(JSON.parse(event.data));
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
      setState('offline');
      setDiagnostics((current) => ({
        ...current,
        readyState: socket.readyState,
        readyStateLabel: READY_STATE_LABELS[socket.readyState] || 'UNKNOWN',
        closedAt: nowIso(),
        lastCloseCode: event.code || '',
        lastCloseReason: event.reason || '',
      }));
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
      }
    });

    return () => {
      if (socketRef.current !== socket) return;
      socketRef.current = null;
      socket.close();
    };
  }, [deviceId, token]);

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
    () => ({ state, lastMessage, sendJson, diagnostics }),
    [state, lastMessage, sendJson, diagnostics]
  );
}
