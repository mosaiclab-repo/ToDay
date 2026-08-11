export type Category = 'client' | 'business_ops' | 'personal';
export type Priority = 'high' | 'medium' | 'low';
export type Status = 'pending' | 'done' | 'archived';

export interface Task {
  id: string;
  text: string;
  category: Category;
  tag: string | null;
  priority: Priority;
  status: Status;
  date_created: string;
  time_created: string;
  date_completed: string | null;
  time_completed: string | null;
  reopen_count: number;
  is_subtask: 0 | 1;
  parent_task_id: string | null;
  notes: string | null;
}

export interface RefreshSummary {
  tasks_to_archive: number;
  tasks_to_carry: number;
}

export interface RefreshResult {
  tasks_archived_count: number;
  tasks_carried_count: number;
  refresh_timestamp: string;
}

export interface TodayApi {
  getTasks(category: Category): Promise<Task[]>;
  createTask(input: {
    text: string;
    category: Category;
    priority?: Priority;
    tag?: string;
    parent_task_id?: string;
  }): Promise<Task>;
  toggleTask(id: string): Promise<Task>;
  setPriority(id: string, priority: Priority): Promise<Task>;
  getArchive(): Promise<Task[]>;
  getRefreshSummary(): Promise<RefreshSummary>;
  refreshDay(): Promise<RefreshResult>;
  getTags(): Promise<string[]>;
  reopenTask(id: string): Promise<Task>;
  updateNotes(id: string, notes: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}

export const TABS: { key: Category; label: string }[] = [
  { key: 'client', label: 'Client Work' },
  { key: 'business_ops', label: 'Business Ops' },
  { key: 'personal', label: 'Personal' },
];
