import { apiFetch } from './client.js';

export function listStock() {
  return apiFetch('/stock');
}

export function createStockItem(payload) {
  return apiFetch('/stock', {
    method: 'POST',
    body: payload,
  });
}

export function updateStockItem(id, payload) {
  return apiFetch(`/stock/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteStockItem(id) {
  return apiFetch(`/stock/${id}`, {
    method: 'DELETE',
  });
}

export function acknowledgeStockAlert(id) {
  return apiFetch(`/stock/${id}/ack-alert`, {
    method: 'POST',
  });
}
