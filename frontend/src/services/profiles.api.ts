export interface ImapProfile {
  id: string;
  name: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword?: string;
  imapTls: boolean;
  imapMode: string;
  imapPollInterval: number;
  mailDomain: string;
  mailBaseAddress: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export const profilesApi = {
  getProfiles: () => request<ImapProfile[]>('/profiles'),
  getActiveProfile: () => request<ImapProfile>('/profiles/active'),
  getProfile: (id: string) => request<ImapProfile>(`/profiles/${id}`),
  createProfile: (data: Partial<ImapProfile>) => request<ImapProfile>('/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateProfile: (id: string, data: Partial<ImapProfile>) => request<ImapProfile>(`/profiles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteProfile: (id: string) => request<{ success: boolean; message: string }>(`/profiles/${id}`, { method: 'DELETE' }),
  activateProfile: (id: string) => request<{ success: boolean; activeProfileId: string }>(`/profiles/${id}/activate`, { method: 'POST' }),
  exportProfiles: () => request<Partial<ImapProfile>[]>('/profiles/export'),
  importProfiles: (data: Partial<ImapProfile>[]) => request<{ success: boolean; imported: number }>('/profiles/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};
