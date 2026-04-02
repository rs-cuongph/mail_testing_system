import type { EmailDetail, ThreadDetail, ThreadsResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  getThreads: () => request<ThreadsResponse>('/threads'),
  getThreadByTag: (tag: string) => request<ThreadDetail>(`/threads/${encodeURIComponent(tag)}`),
  getEmailById: (id: string) => request<EmailDetail>(`/emails/${id}`),
  deleteThread: (tag: string) => request(`/threads/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
  deleteAll: () => request('/threads', { method: 'DELETE' }),
  getAttachmentDownloadUrl: (id: string) => `${BASE_URL}/attachments/${id}/download`,
};
