import { useCallback, useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import TaskList from './components/TaskList';
import AddTaskForm from './components/AddTaskForm';
import ArchiveView from './components/ArchiveView';
import ConfirmModal from './components/ConfirmModal';
import { api } from './api';
import type { Category, Priority, Task } from './types';

type View = Category | 'archive';

export default function App() {
  const [view, setView] = useState<View>('client');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archiveTasks, setArchiveTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState<{ tasks_to_archive: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const loadTasks = useCallback(async (category: Category) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks(category);
      setTasks(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getArchive();
      setArchiveTasks(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'archive') {
      loadArchive();
    } else {
      loadTasks(view);
    }
  }, [view, loadTasks, loadArchive]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleToggle(id: string) {
    // Optimistic update so checking a task feels instant.
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'pending' ? 'done' : 'pending' } : t))
    );
    try {
      await api.toggleTask(id);
    } catch (e) {
      setError((e as Error).message);
      loadTasks(view as Category);
    }
  }

  async function handlePriorityChange(id: string, priority: Priority) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority } : t)));
    try {
      await api.setPriority(id, priority);
    } catch (e) {
      setError((e as Error).message);
      loadTasks(view as Category);
    }
  }

  async function handleAddTask(input: { text: string; priority: Priority; tags?: string[] }) {
    if (view === 'archive') return;
    try {
      const created = await api.createTask({ ...input, category: view });
      setTasks((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAddSubtask(parentId: string, text: string) {
    try {
      const created = await api.createTask({ text, category: view as Category, parent_task_id: parentId });
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === parentId);
        if (idx === -1) return [...prev, created];
        // Insert right after the parent (and after any existing subtasks of it).
        let insertAt = idx + 1;
        while (insertAt < prev.length && prev[insertAt].parent_task_id === parentId) insertAt++;
        const next = [...prev];
        next.splice(insertAt, 0, created);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function openRefreshConfirm() {
    try {
      const summary = await api.getRefreshSummary();
      setRefreshSummary(summary);
      setConfirmOpen(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function confirmRefresh() {
    setConfirmOpen(false);
    try {
      const result = await api.refreshDay();
      setToast(`Day refreshed — ${result.tasks_archived_count} archived, ${result.tasks_carried_count} carried forward`);
      if (view === 'archive') {
        loadArchive();
      } else {
        loadTasks(view);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleReopen(id: string) {
    setArchiveTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.reopenTask(id);
      setToast('Task reopened — back on its active list');
    } catch (e) {
      setError((e as Error).message);
      loadArchive();
    }
  }

  async function handleSaveNotes(id: string, notes: string) {
    setArchiveTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: notes.trim() || null } : t)));
    try {
      await api.updateNotes(id, notes);
    } catch (e) {
      setError((e as Error).message);
      loadArchive();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setArchiveTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTask(id);
      setToast('Task deleted');
    } catch (e) {
      setError((e as Error).message);
      loadArchive();
    }
  }

  return (
    <div className="app-shell">
      <TopBar view={view} onSelectView={(v) => setView(v as View)} onRefreshDay={openRefreshConfirm} />

      {error && (
        <div className="empty-state" style={{ color: '#ff8f70' }}>
          {error}
        </div>
      )}

      {!error && loading && <div className="empty-state">Loading…</div>}

      {!error && !loading && view === 'archive' && (
        <ArchiveView
          tasks={archiveTasks}
          onReopen={handleReopen}
          onSaveNotes={handleSaveNotes}
          onRequestDelete={setDeleteTarget}
        />
      )}

      {!error && !loading && view !== 'archive' && (
        <>
          <TaskList
            tasks={tasks}
            onToggle={handleToggle}
            onPriorityChange={handlePriorityChange}
            onAddSubtask={handleAddSubtask}
          />
          <AddTaskForm category={view} onAdd={handleAddTask} />
        </>
      )}

      {confirmOpen && (
        <ConfirmModal
          title="Refresh day?"
          body={`${refreshSummary?.tasks_to_archive ?? 0} task${refreshSummary?.tasks_to_archive === 1 ? '' : 's'} will move to the archive. Pending tasks stay exactly as they are.`}
          confirmLabel="Refresh Day"
          onConfirm={confirmRefresh}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this task?"
          body={`"${deleteTarget.text}" will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
