import { apiFetch } from './client.js';

export function listLocations() {
  return apiFetch('/location');
}

export function sendHeartbeat(payload) {
  return apiFetch('/heartbeat', {
    method: 'POST',
    body: payload,
  });
}
