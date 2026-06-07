import { apiFetch } from './client.js';

export function listStock() {
  return apiFetch('/stock');
}

export function createStockItem(payload) {
  return apiFetch('/stock/item', {
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

export function restockItem(payload) {
  return apiFetch('/stock/restock', {
    method: 'POST',
    body: payload,
  });
}

export function inventoryAdjust(payload) {
  return apiFetch('/stock/inventory', {
    method: 'POST',
    body: payload,
  });
}

export function listStockHistory() {
  return apiFetch('/stock/history');
}
