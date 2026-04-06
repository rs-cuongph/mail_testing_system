export interface SystemSettings {
  imapHost: string;
  imapPort: number;
  imapUser: string;
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

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:7654/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
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
