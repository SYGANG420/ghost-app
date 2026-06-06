import { useEffect, useMemo, useState } from 'react';

export function useGhostSocket(deviceId, token) {
  const [state, setState] = useState('offline');
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!deviceId || !token) {
      setState('offline');
      return undefined;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/${encodeURIComponent(deviceId)}/${encodeURIComponent(token)}`
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
