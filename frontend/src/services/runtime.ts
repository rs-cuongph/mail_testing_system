import { getBackendUrl } from '../lib/tauri-bridge';

let configuredApiBaseUrl =
  new URLSearchParams(window.location.search).get('apiBaseUrl') ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:7654/api';
let runtimeInitPromise: Promise<void> | null = null;

export function initializeRuntime() {
  if (runtimeInitPromise) {
    return runtimeInitPromise;
  }

  runtimeInitPromise = (async () => {
    configuredApiBaseUrl = (await getBackendUrl()).replace(/\/$/, '');
  })();

  return runtimeInitPromise;
}

export function getApiBaseUrl() {
  return configuredApiBaseUrl.replace(/\/$/, '');
}

export function getBackendOrigin() {
  return getApiBaseUrl().replace(/\/api$/, '');
}
