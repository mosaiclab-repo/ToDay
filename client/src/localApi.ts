import type { Category, Priority, RefreshResult, RefreshSummary, Task, TodayApi } from './types';

const STORAGE_KEY = 'today_tasks_v1';

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Mirrors the server's ordering: root-level entries oldest date_created first,
// each immediately followed by its own subtasks (in the same sorted order).
function orderWithSubtasks(rootLevel: Task[], subtasksByParent: Map<string, Task[]>): Task[] {
  const out: Task[] = [];
  for (const t of rootLevel) {
    out.push(t);
    out.push(...(subtasksByParent.get(t.id) ?? []));
  }
  return out;
}

export const localApi: TodayApi = {
  async getTasks(category: Category): Promise<Task[]> {
    const all = load();
    const active = all
      .filter((t) => t.category === category && t.status !== 'archived')
      .sort((a, b) => (a.date_created < b.date_created ? -1 : a.date_created > b.date_created ? 1 : 0));
    const activeIds = new Set(active.map((t) => t.id));

    // A subtask renders under its parent only while that parent is still active.
    // If the parent got archived (Refresh Day) while the subtask stayed pending,
    // the subtask falls back to the root level instead of vanishing.
    const subtasksByParent = new Map<string, Task[]>();
    const rootLevel: Task[] = [];
    for (const t of active) {
      if (t.is_subtask && t.parent_task_id && activeIds.has(t.parent_task_id)) {
        if (!subtasksByParent.has(t.parent_task_id)) subtasksByParent.set(t.parent_task_id, []);
        subtasksByParent.get(t.parent_task_id)!.push(t);
      } else {
        rootLevel.push(t);
      }
    }

    return orderWithSubtasks(rootLevel, subtasksByParent);
  },

  async createTask(input: {
    text: string;
    category: Category;
    priority?: Priority;
    client_name?: string;
    parent_task_id?: string;
  }): Promise<Task> {
    const all = load();
    let category: Category = input.category;
    let is_subtask: 0 | 1 = 0;

    if (input.parent_task_id) {
      const parent = all.find((t) => t.id === input.parent_task_id);
      if (!parent) throw new Error('parent task not found');
      category = parent.category;
      is_subtask = 1;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    const task: Task = {
      id: uuid(),
      text: input.text.trim(),
      category,
      client_name: category === 'client' && input.client_name ? input.client_name.trim() : null,
      priority: input.priority ?? 'medium',
      status: 'pending',
      date_created: `${y}-${m}-${d}`,
      time_created: now.toTimeString().slice(0, 8),
      date_completed: null,
      time_completed: null,
      reopen_count: 0,
      is_subtask,
      parent_task_id: input.parent_task_id ?? null,
    };

    all.push(task);
    save(all);
    return task;
  },

  async toggleTask(id: string): Promise<Task> {
    const all = load();
    const task = all.find((t) => t.id === id);
    if (!task) throw new Error('not found');
    if (task.status === 'archived') throw new Error('archived tasks are read-only');

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    if (task.status === 'pending') {
      task.status = 'done';
      task.date_completed = `${y}-${m}-${d}`;
      task.time_completed = now.toTimeString().slice(0, 8);
    } else {
      task.status = 'pending';
      task.date_completed = null;
      task.time_completed = null;
      task.reopen_count += 1;
    }
    save(all);
    return task;
  },

  async setPriority(id: string, priority: Priority): Promise<Task> {
    const all = load();
    const task = all.find((t) => t.id === id);
    if (!task) throw new Error('not found');
    if (task.status === 'archived') throw new Error('archived tasks are read-only');
    task.priority = priority;
    save(all);
    return task;
  },

  async getArchive(): Promise<Task[]> {
    const all = load();
    return all
      .filter((t) => t.status === 'archived')
      .sort((a, b) => {
        const da = `${a.date_completed ?? ''}T${a.time_completed ?? ''}`;
        const db = `${b.date_completed ?? ''}T${b.time_completed ?? ''}`;
        return da < db ? 1 : da > db ? -1 : 0;
      });
  },

  async getRefreshSummary(): Promise<RefreshSummary> {
    const all = load();
    return {
      tasks_to_archive: all.filter((t) => t.status === 'done').length,
      tasks_to_carry: all.filter((t) => t.status === 'pending').length,
    };
  },

  async refreshDay(): Promise<RefreshResult> {
    const all = load();
    const archived = all.filter((t) => t.status === 'done');
    const carried = all.filter((t) => t.status === 'pending');
    for (const t of archived) t.status = 'archived';
    save(all);
    return {
      tasks_archived_count: archived.length,
      tasks_carried_count: carried.length,
      refresh_timestamp: new Date().toISOString(),
    };
  },
};
