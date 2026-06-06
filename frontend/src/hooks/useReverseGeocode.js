import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '../api/client.js';

const CACHE_MS = 30_000;
const WAITING = '\u4f4f\u6240\u53d6\u5f97\u5f85\u6a5f\u4e2d';
const UNKNOWN = '\u4f4f\u6240\u4e0d\u660e';
const ERROR = '\u4f4f\u6240\u53d6\u5f97\u30a8\u30e9\u30fc';
const NEAR = '\u4ed8\u8fd1';

export function useReverseGeocode(position) {
  const cacheRef = useRef(null);
  const [address, setAddress] = useState(WAITING);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!position) {
      setAddress(WAITING);
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
        const location = payload?.response?.location?.[0];
        const nextAddress = location
          ? `${location.prefecture || ''}${location.city || ''}${location.town || ''}${NEAR}`
          : UNKNOWN;
        cacheRef.current = { key: cacheKey, address: nextAddress, timestamp: Date.now() };
        setAddress(nextAddress);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        console.log('[GHOST MAP] Reverse geocode error', error);
        setAddress(ERROR);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [position]);

  return { address, status };
}
