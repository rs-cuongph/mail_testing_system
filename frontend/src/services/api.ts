import type { EmailDetail, ThreadDetail, ThreadsResponse, Category, SearchResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:7654/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }
  return res.json();
}

export interface AppConfig {
  mailDomain: string;
  mailBaseAddress: string;
}

export const api = {
  getConfig: () => request<AppConfig>('/config'),
  getThreads: () => request<ThreadsResponse>('/threads'),
  getThreadByTag: (tag: string) => request<ThreadDetail>(`/threads/${encodeURIComponent(tag)}`),
  getEmailById: (id: string) => request<EmailDetail>(`/emails/${id}`),
  deleteThread: (tag: string) => request(`/threads/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
  deleteAll: () => request('/threads', { method: 'DELETE' }),
  getAttachmentDownloadUrl: (id: string) => `${BASE_URL}/attachments/${id}/download`,
  
  // Read status
  markAsRead: (id: string) => request(`/emails/${id}/read`, { method: 'PATCH' }),
  markThreadAsRead: (threadId: string) => request(`/emails/thread/${threadId}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/emails/read-all', { method: 'PATCH' }),
  
  // Search
  search: (query: string) => request<SearchResult[]>(`/emails/search?q=${encodeURIComponent(query)}`),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (data: { name: string; color?: string }) => request<Category>('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateCategory: (id: string, data: { name?: string; color?: string }) => request<Category>(`/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),
  assignThreads: (categoryId: string, threadIds: string[]) => request(`/categories/${categoryId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadIds }),
  }),
  unassignThread: (categoryId: string, threadId: string) => request(`/categories/${categoryId}/threads/${threadId}`, { method: 'DELETE' }),
};
