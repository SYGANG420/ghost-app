import { apiFetch } from './client.js';

export function getLatestLocation(deviceId) {
  return apiFetch(`/location/${deviceId}/latest`);
}

export function listLocationHistory(deviceId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/location/${deviceId}/history${query ? `?${query}` : ''}`);
}

export function reportLocation(deviceId, payload) {
  return apiFetch(`/location/${deviceId}`, {
    method: 'POST',
    body: payload,
  });
}
