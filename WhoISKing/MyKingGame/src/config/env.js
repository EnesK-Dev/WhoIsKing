/**
 * API ve SignalR tabanı. Fiziksel cihazda `EXPO_PUBLIC_API_BASE_URL` (ör. ngrok veya PC LAN IP) verin.
 * Tanımlı değilse yerel backend: launchSettings `http` profili (5274).
 */
const DEFAULT_API_BASE = 'http://localhost:5274';

export function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
  return String(raw).replace(/\/+$/, '');
}

/** Ücretsiz ngrok: ara yüz uyarısı bazı istekleri bozabiliyor; yalnızca ngrok hostunda eklenir. */
export function getNgrokBypassHeaders() {
  if (!getApiBaseUrl().includes('ngrok')) {
    return {};
  }
  return { 'ngrok-skip-browser-warning': 'true' };
}

export function getSignalRHubUrl() {
  const explicit = process.env.EXPO_PUBLIC_SIGNALR_HUB_URL;
  if (explicit) {
    return String(explicit).trim();
  }
  return `${getApiBaseUrl()}/gameHub`;
}
