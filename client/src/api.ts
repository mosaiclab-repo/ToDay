import type { Category, Priority, RefreshResult, RefreshSummary, Task, TodayApi } from './types';
import { localApi } from './localApi';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localTime(d = new Date()): string {
  return d.toTimeString().slice(0, 8);
}

const remoteApi: TodayApi = {
  getTasks: (category: Category) => request<Task[]>(`/tasks?category=${category}`),

  createTask: (input: {
    text: string;
    category: Category;
    priority?: Priority;
    tags?: string[];
    parent_task_id?: string;
  }) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        date_created: localDate(),
        time_created: localTime(),
      }),
    }),

  toggleTask: (id: string) =>
    request<Task>(`/tasks/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({
        date_completed: localDate(),
        time_completed: localTime(),
      }),
    }),

  setPriority: (id: string, priority: Priority) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  getArchive: () => request<Task[]>('/archive'),

  getRefreshSummary: () => request<RefreshSummary>('/refresh-day/summary'),

  refreshDay: () =>
    request<RefreshResult>('/refresh-day', {
      method: 'POST',
      body: JSON.stringify({ refresh_timestamp: new Date().toISOString() }),
    }),

  getTags: () => request<string[]>('/tags'),

  reopenTask: (id: string) => request<Task>(`/tasks/${id}/reopen`, { method: 'PATCH' }),

  updateNotes: (id: string, notes: string) =>
    request<Task>(`/tasks/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// Standalone builds (see vite.demo.config.ts) run entirely client-side against
// localStorage instead of the Express/SQLite server, so the app can be opened
// as a single file with no server to run.
export const api = import.meta.env.VITE_STANDALONE === 'true' ? localApi : remoteApi;

export { localDate, localTime };
