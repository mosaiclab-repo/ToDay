import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const CATEGORIES = ['client', 'business_ops', 'personal'];
const PRIORITIES = ['high', 'medium', 'low'];

function nowServerDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function nowServerTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

// Attach subtasks directly after their parent, preserving insertion order within each group.
function orderWithSubtasks(topLevel, subtasksByParent) {
  const out = [];
  for (const t of topLevel) {
    out.push(t);
    const kids = subtasksByParent.get(t.id) || [];
    out.push(...kids);
  }
  return out;
}

// GET /api/tasks?category=client  -> active (pending + done) tasks for a category, oldest date_created first
app.get('/api/tasks', (req, res) => {
  const { category } = req.query;
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }

  const params = [];
  let where = "status IN ('pending','done')";
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  // Sorted once, oldest date_created first — both the root-level query below and
  // each parent's subtasks reuse this order rather than re-sorting.
  const active = db
    .prepare(`SELECT * FROM tasks WHERE ${where} ORDER BY date_created ASC, rowid ASC`)
    .all(...params);
  const activeIds = new Set(active.map((t) => t.id));

  // A subtask renders under its parent only while that parent is still active.
  // If the parent was archived (Refresh Day) while the subtask stayed pending,
  // the subtask falls back to rendering at the root level instead of vanishing —
  // nothing is ever silently hidden.
  const subtasksByParent = new Map();
  const rootLevel = [];
  for (const t of active) {
    if (t.is_subtask && t.parent_task_id && activeIds.has(t.parent_task_id)) {
      if (!subtasksByParent.has(t.parent_task_id)) subtasksByParent.set(t.parent_task_id, []);
      subtasksByParent.get(t.parent_task_id).push(t);
    } else {
      rootLevel.push(t);
    }
  }

  res.json(orderWithSubtasks(rootLevel, subtasksByParent));
});

// GET /api/refresh-day/summary -> counts across all active tasks, for the confirmation prompt
app.get('/api/refresh-day/summary', (req, res) => {
  const doneCount = db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'done'").get().c;
  const pendingCount = db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'pending'").get().c;
  res.json({ tasks_to_archive: doneCount, tasks_to_carry: pendingCount });
});

// GET /api/archive -> archived tasks, most recently completed first
app.get('/api/archive', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE status = 'archived' ORDER BY date_completed DESC, time_completed DESC, rowid DESC`
    )
    .all();
  res.json(rows);
});

// GET /api/tags -> distinct tag values used so far, for autocomplete suggestions
app.get('/api/tags', (req, res) => {
  const rows = db
    .prepare(`SELECT DISTINCT tag FROM tasks WHERE tag IS NOT NULL AND tag != '' ORDER BY tag ASC`)
    .all();
  res.json(rows.map((r) => r.tag));
});

// POST /api/tasks -> create a task or subtask
app.post('/api/tasks', (req, res) => {
  const { text, category, tag, priority, parent_task_id, date_created, time_created } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  let resolvedCategory = category;
  let isSubtask = 0;

  if (parent_task_id) {
    const parent = db.prepare('SELECT * FROM tasks WHERE id = ?').get(parent_task_id);
    if (!parent) return res.status(400).json({ error: 'parent task not found' });
    resolvedCategory = parent.category;
    isSubtask = 1;
  }

  if (!CATEGORIES.includes(resolvedCategory)) {
    return res.status(400).json({ error: 'invalid category' });
  }

  const resolvedPriority = PRIORITIES.includes(priority) ? priority : 'medium';

  const id = uuidv4();
  const dCreated = date_created || nowServerDate();
  const tCreated = time_created || nowServerTime();

  db.prepare(
    `INSERT INTO tasks (id, text, category, tag, priority, status, date_created, time_created, is_subtask, parent_task_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    id,
    text.trim(),
    resolvedCategory,
    resolvedCategory === 'client' && tag ? tag.trim() : null,
    resolvedPriority,
    dCreated,
    tCreated,
    isSubtask,
    parent_task_id || null
  );

  const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(created);
});

// PATCH /api/tasks/:id/toggle -> flip pending <-> done
app.patch('/api/tasks/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { date_completed, time_completed } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'not found' });
  if (task.status === 'archived') return res.status(400).json({ error: 'archived tasks are read-only' });

  if (task.status === 'pending') {
    db.prepare(
      `UPDATE tasks SET status = 'done', date_completed = ?, time_completed = ? WHERE id = ?`
    ).run(date_completed || nowServerDate(), time_completed || nowServerTime(), id);
  } else {
    db.prepare(
      `UPDATE tasks SET status = 'pending', date_completed = NULL, time_completed = NULL, reopen_count = reopen_count + 1 WHERE id = ?`
    ).run(id);
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// PATCH /api/tasks/:id -> edit priority (the only field the spec calls out as editable anytime)
app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'not found' });
  if (task.status === 'archived') return res.status(400).json({ error: 'archived tasks are read-only' });

  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'invalid priority' });
    db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(priority, id);
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// PATCH /api/tasks/:id/reopen -> archived task moves back to its category's active list, pending
app.patch('/api/tasks/:id/reopen', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'not found' });
  if (task.status !== 'archived') return res.status(400).json({ error: 'only archived tasks can be reopened' });

  db.prepare(
    `UPDATE tasks SET status = 'pending', date_completed = NULL, time_completed = NULL, reopen_count = reopen_count + 1 WHERE id = ?`
  ).run(id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// PATCH /api/tasks/:id/notes -> add/edit a short notes field (allowed on archived tasks too)
app.patch('/api/tasks/:id/notes', (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'not found' });

  db.prepare('UPDATE tasks SET notes = ? WHERE id = ?').run(
    typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/tasks/:id -> permanently remove the task (and any subtasks, to avoid orphaned references)
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'not found' });

  const run = db.transaction(() => {
    db.prepare('DELETE FROM tasks WHERE parent_task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  });
  run();

  res.status(204).end();
});

// POST /api/refresh-day -> archive all done tasks, log the event
app.post('/api/refresh-day', (req, res) => {
  const { refresh_timestamp } = req.body;
  const timestamp = refresh_timestamp || new Date().toISOString();

  const run = db.transaction(() => {
    const archivedCount = db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'done'").get().c;
    const carriedCount = db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'pending'").get().c;

    db.prepare("UPDATE tasks SET status = 'archived' WHERE status = 'done'").run();

    db.prepare(
      `INSERT INTO day_refresh_log (id, refresh_timestamp, tasks_archived_count, tasks_carried_count) VALUES (?, ?, ?, ?)`
    ).run(uuidv4(), timestamp, archivedCount, carriedCount);

    return { tasks_archived_count: archivedCount, tasks_carried_count: carriedCount };
  });

  const result = run();
  res.json({ ...result, refresh_timestamp: timestamp });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ToDay server listening on http://localhost:${PORT}`);
});
