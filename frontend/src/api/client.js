export const APP_ORIGIN = 'https://ghost-control.duckdns.org';
export const BASE_URL = `${APP_ORIGIN}/api`;
export const WS_BASE_URL = 'wss://ghost-control.duckdns.org/ws';
const DEVICE_KEY = 'ghost_control_device_id';
const TOKEN_KEY = 'ghost_control_jwt';

async function requestFreshToken() {
  const deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) return '';

  const response = await fetch(`${BASE_URL}/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!response.ok) return '';

  const payload = await response.json();
  const token = payload.token || payload.access_token || '';
  if (token) localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export async function apiFetch(path, options = {}) {
  const token = options.token || localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const requestOptions = {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  };

  let response = await fetch(`${BASE_URL}${path}`, requestOptions);

  if (response.status === 401 && !options.token && path !== '/auth/device') {
    localStorage.removeItem(TOKEN_KEY);
    const freshToken = await requestFreshToken();
    if (freshToken) {
      response = await fetch(`${BASE_URL}${path}`, {
        ...requestOptions,
        headers: {
          ...headers,
          Authorization: `Bearer ${freshToken}`,
        },
      });
    }
  }

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
