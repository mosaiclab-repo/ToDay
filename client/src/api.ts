import type { Category, Priority, RefreshResult, RefreshSummary, Task } from './types';

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

export const api = {
  getTasks: (category: Category) => request<Task[]>(`/tasks?category=${category}`),

  createTask: (input: {
    text: string;
    category: Category;
    priority?: Priority;
    client_name?: string;
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
};

export { localDate, localTime };
