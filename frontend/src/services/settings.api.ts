import { getApiBaseUrl } from './runtime';

export interface SystemSettings {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  credentialKey?: string | null;
  imapPassword?: string;
  imapTls: boolean;
  imapMode: string;
  imapPollInterval: number;
  mailDomain: string;
  mailBaseAddress: string;
}

export interface SettingsStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastChecked?: string;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }
  return res.json();
}

export const settingsApi = {
  getSettings: () => request<SystemSettings>('/settings'),
  updateSettings: (data: SystemSettings) => request<{ success: boolean; message: string }>('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getStatus: () => request<SettingsStatus>('/settings/status'),
};
