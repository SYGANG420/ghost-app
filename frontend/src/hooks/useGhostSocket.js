import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WS_BASE_URL } from '../api/client.js';

export function useGhostSocket(deviceId, token) {
  const socketRef = useRef(null);
  const openedRef = useRef(false);
  const [state, setState] = useState('offline');
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!deviceId || !token) {
      setState('offline');
      return undefined;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/${encodeURIComponent(deviceId)}/${encodeURIComponent(token)}`
    );
    socketRef.current = socket;
    openedRef.current = false;

    setState('connecting');

    socket.addEventListener('open', () => {
      openedRef.current = true;
      setState('online');
    });
    socket.addEventListener('message', (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage({ raw: event.data });
      }
    });
    socket.addEventListener('close', () => {
      openedRef.current = false;
      setState('offline');
    });
    socket.addEventListener('error', () => {
      if (!openedRef.current) {
        setState('error');
      }
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [deviceId, token]);

  const sendJson = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log('[GHOST MAP] WebSocket send skipped', { readyState: socket?.readyState, payload });
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  return useMemo(() => ({ state, lastMessage, sendJson }), [state, lastMessage, sendJson]);
}
