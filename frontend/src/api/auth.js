import { apiFetch } from './client.js';

export function requestDeviceToken(deviceId) {
  return apiFetch('/auth/device', {
    method: 'POST',
    body: { device_id: deviceId },
  });
}

export function refreshToken(refreshTokenValue) {
  return apiFetch('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshTokenValue },
  });
}

export function revokeToken(token) {
  return apiFetch('/auth/revoke', {
    method: 'POST',
    token,
  });
}
