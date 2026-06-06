import { useEffect, useMemo, useState } from 'react';
import { WS_BASE_URL } from '../api/client.js';

export function useGhostSocket(deviceId, token) {
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

    setState('connecting');

    socket.addEventListener('open', () => setState('online'));
    socket.addEventListener('message', (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage({ raw: event.data });
      }
    });
    socket.addEventListener('close', () => setState('offline'));
    socket.addEventListener('error', () => setState('error'));

    return () => socket.close();
  }, [deviceId, token]);

  return useMemo(() => ({ state, lastMessage }), [state, lastMessage]);
}
