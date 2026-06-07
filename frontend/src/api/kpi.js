import { apiFetch } from './client.js';

export function getKpiSummary(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/kpi/actual${query ? `?${query}` : ''}`);
}

export function getInvestmentHistory() {
  return apiFetch('/kpi/investments');
}

export function createInvestment(payload) {
  return apiFetch('/kpi/investments', {
    method: 'POST',
    body: payload,
  });
}

export function updateInvestment(id, payload) {
  return apiFetch(`/kpi/investments/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteInvestment(id) {
  return apiFetch(`/kpi/investments/${id}`, {
    method: 'DELETE',
  });
}
