import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '../api/client.js';

const CACHE_MS = 30_000;

export function useReverseGeocode(position) {
  const cacheRef = useRef(null);
  const [address, setAddress] = useState('住所取得待機中');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!position) {
      setAddress('住所取得待機中');
      setStatus('idle');
      return;
    }

    const { lat, lon } = position;
    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const cached = cacheRef.current;

    if (cached && cached.key === cacheKey && Date.now() - cached.timestamp < CACHE_MS) {
      setAddress(cached.address);
      setStatus('cached');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    reverseGeocode(lat, lon)
      .then((payload) => {
        if (cancelled) return;
        const nextAddress = payload.display_name || '住所不明';
        cacheRef.current = { key: cacheKey, address: nextAddress, timestamp: Date.now() };
        setAddress(nextAddress);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        console.log('[GHOST MAP] Reverse geocode error', error);
        setAddress('住所取得エラー');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [position]);

  return { address, status };
}
