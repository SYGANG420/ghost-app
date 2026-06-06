import { useCallback, useEffect, useMemo, useState } from 'react';
import { requestDeviceToken } from '../api/client.js';

const DEVICE_KEY = 'ghost_control_device_id';
const TOKEN_KEY = 'ghost_control_jwt';

export function useDeviceAuth() {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem(DEVICE_KEY) || '');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const hasDevice = Boolean(deviceId);

  const selectDevice = useCallback(async (nextDeviceId) => {
    setStatus('loading');
    setError('');
    localStorage.setItem(DEVICE_KEY, nextDeviceId);
    setDeviceId(nextDeviceId);

    try {
      const payload = await requestDeviceToken(nextDeviceId);
      const nextToken = payload.token || payload.access_token || '';

      if (!nextToken) {
        throw new Error('Token missing in API response');
      }

      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setStatus('ready');
    } catch (authError) {
      const fallbackToken = `dev.${btoa(nextDeviceId)}.${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, fallbackToken);
      setToken(fallbackToken);
      setStatus('mock');
      setError(authError.message);
    }
  }, []);

  useEffect(() => {
    if (deviceId && token) {
      setStatus('ready');
    }
  }, [deviceId, token]);

  return useMemo(
    () => ({ deviceId, token, status, error, hasDevice, selectDevice }),
    [deviceId, token, status, error, hasDevice, selectDevice]
  );
}
