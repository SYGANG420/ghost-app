import { apiFetch } from './client.js';

export function requestRemoteWipe(deviceId, payload = {}) {
  return apiFetch(`/wipe/${deviceId}`, {
    method: 'POST',
    body: payload,
  });
}

export function requestVpsWipe(payload = {}) {
  return apiFetch('/wipe/vps', {
    method: 'POST',
    body: payload,
  });
}

export function getWipeStatus(deviceId) {
  return apiFetch(`/wipe/${deviceId}/status`);
}

export function cancelRemoteWipe(deviceId) {
  return apiFetch(`/wipe/${deviceId}`, {
    method: 'DELETE',
  });
}

export function updateDeadManSwitch(deviceId, payload) {
  return apiFetch(`/wipe/${deviceId}/deadman`, {
    method: 'POST',
    body: payload,
  });
}
