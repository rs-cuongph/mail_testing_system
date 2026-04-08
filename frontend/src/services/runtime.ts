const searchParams = new URLSearchParams(window.location.search);

const configuredApiBaseUrl =
  searchParams.get('apiBaseUrl') ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:7654/api';

export function getApiBaseUrl() {
  return configuredApiBaseUrl.replace(/\/$/, '');
}

export function getBackendOrigin() {
  return getApiBaseUrl().replace(/\/api$/, '');
}
