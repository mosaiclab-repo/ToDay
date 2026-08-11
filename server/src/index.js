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
  let where = "status IN ('pending','done') AND is_subtask = 0";
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  const topLevel = db
    .prepare(`SELECT * FROM tasks WHERE ${where} ORDER BY date_created ASC, rowid ASC`)
    .all(...params);

  const subtasksByParent = new Map();
  if (topLevel.length) {
    const placeholders = topLevel.map(() => '?').join(',');
    const subtasks = db
      .prepare(
        `SELECT * FROM tasks WHERE parent_task_id IN (${placeholders}) AND status IN ('pending','done') ORDER BY rowid ASC`
      )
      .all(...topLevel.map((t) => t.id));
    for (const s of subtasks) {
      if (!subtasksByParent.has(s.parent_task_id)) subtasksByParent.set(s.parent_task_id, []);
      subtasksByParent.get(s.parent_task_id).push(s);
    }
  }

  res.json(orderWithSubtasks(topLevel, subtasksByParent));
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

// POST /api/tasks -> create a task or subtask
app.post('/api/tasks', (req, res) => {
  const { text, category, client_name, priority, parent_task_id, date_created, time_created } = req.body;

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
    `INSERT INTO tasks (id, text, category, client_name, priority, status, date_created, time_created, is_subtask, parent_task_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    id,
    text.trim(),
    resolvedCategory,
    resolvedCategory === 'client' && client_name ? client_name.trim() : null,
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
