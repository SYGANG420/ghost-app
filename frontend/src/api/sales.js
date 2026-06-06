import { apiFetch } from './client.js';

export function listSales(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/sales${query ? `?${query}` : ''}`);
}

export function createSale(payload) {
  return apiFetch('/sales', {
    method: 'POST',
    body: payload,
  });
}

export function updateSale(id, payload) {
  return apiFetch(`/sales/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteSale(id) {
  return apiFetch(`/sales/${id}`, {
    method: 'DELETE',
  });
}

export function listExpenses(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/expenses${query ? `?${query}` : ''}`);
}

export function createExpense(payload) {
  return apiFetch('/expenses', {
    method: 'POST',
    body: payload,
  });
}
