import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_ORIGIN } from '../api/client.js';
import {
  chooseNativeClientCertificate,
  configureNativeLocation,
  getNativeLocationStatus,
  isNativeAndroid,
  startNativeLocationService,
  stopNativeLocationService,
} from '../native/ghostLocation.js';

const POLL_MS = 15_000;

export function useNativeLocationService(deviceId, token) {
  const [status, setStatus] = useState({
    available: isNativeAndroid(),
    running: false,
    certificateAlias: '',
    lastSentAt: '',
    lastError: '',
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isNativeAndroid()) {
      setStatus((current) => ({ ...current, available: false, running: false }));
      return;
    }
    try {
      const next = await getNativeLocationStatus();
      setStatus({
        available: true,
        running: Boolean(next.running),
        certificateAlias: next.certificateAlias || '',
        lastSentAt: next.lastSentAt || '',
        lastError: next.lastError || '',
      });
    } catch (error) {
      setStatus((current) => ({ ...current, available: true, lastError: error.message || 'status failed' }));
    }
  }, []);

  const configure = useCallback(async () => {
    if (!deviceId || !token || !isNativeAndroid()) return;
    await configureNativeLocation({ deviceId, token, baseUrl: APP_ORIGIN });
    await refresh();
  }, [deviceId, refresh, token]);

  useEffect(() => {
    configure();
  }, [configure]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const chooseCertificate = useCallback(async () => {
    setBusy(true);
    try {
      await configure();
      await chooseNativeClientCertificate();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [configure, refresh]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      await configure();
      await startNativeLocationService();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [configure, refresh]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await stopNativeLocationService();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return useMemo(
    () => ({ status, busy, refresh, chooseCertificate, start, stop }),
    [busy, chooseCertificate, refresh, start, status, stop]
  );
}
