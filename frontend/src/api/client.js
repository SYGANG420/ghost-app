export const APP_ORIGIN = 'https://ghost-control.duckdns.org';
export const BASE_URL = `${APP_ORIGIN}/api`;
export const WS_BASE_URL = 'wss://ghost-control.duckdns.org/ws';

export async function apiFetch(path, options = {}) {
  const token = options.token || localStorage.getItem('ghost_control_jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });

  const response = await fetch(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  return response.json();
}
