import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestDeviceToken } from '../api/auth.js';

const DEVICE_KEY = 'ghost_control_device_id';
const TOKEN_KEY = 'ghost_control_jwt';

export function useDeviceAuth() {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem(DEVICE_KEY) || '');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const bootRefreshRef = useRef(false);

  const hasDevice = Boolean(deviceId);

  const issueToken = useCallback(async (nextDeviceId) => {
    setStatus('loading');
    setError('');

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
      localStorage.removeItem(TOKEN_KEY);
      setToken('');
      setError(authError.message);
      setStatus('error');
    }
  }, []);

  const selectDevice = useCallback(async (nextDeviceId) => {
    localStorage.setItem(DEVICE_KEY, nextDeviceId);
    setDeviceId(nextDeviceId);
    await issueToken(nextDeviceId);
  }, [issueToken]);

  const refreshToken = useCallback(async () => {
    if (!deviceId) return;
    await issueToken(deviceId);
  }, [deviceId, issueToken]);

  const resetDevice = useCallback(() => {
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setDeviceId('');
    setToken('');
    setStatus('idle');
    setError('');
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    if (!bootRefreshRef.current) {
      bootRefreshRef.current = true;
      issueToken(deviceId);
      return;
    }
    if (!token || token.startsWith('dev.')) {
      issueToken(deviceId);
    }
  }, [deviceId, issueToken, token]);

  useEffect(() => {
    if (deviceId && token && !token.startsWith('dev.')) {
      setStatus('ready');
    }
  }, [deviceId, token]);

  return useMemo(
    () => ({ deviceId, token, status, error, hasDevice, selectDevice, refreshToken, resetDevice }),
    [deviceId, token, status, error, hasDevice, selectDevice, refreshToken, resetDevice]
  );
}
