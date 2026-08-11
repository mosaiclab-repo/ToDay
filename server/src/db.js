import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'today.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('client', 'business_ops', 'personal')),
    tags TEXT NOT NULL DEFAULT '[]',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'archived')),
    date_created TEXT NOT NULL,
    time_created TEXT NOT NULL,
    date_completed TEXT,
    time_completed TEXT,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    is_subtask INTEGER NOT NULL DEFAULT 0,
    parent_task_id TEXT REFERENCES tasks(id),
    notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

  CREATE TABLE IF NOT EXISTS day_refresh_log (
    id TEXT PRIMARY KEY,
    refresh_timestamp TEXT NOT NULL,
    tasks_archived_count INTEGER NOT NULL,
    tasks_carried_count INTEGER NOT NULL
  );
`);

// Migrate pre-existing databases: the client_name column was renamed to the
// more general `tag`, so existing task data carries forward instead of being lost.
const existingColumns = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
if (existingColumns.includes('client_name') && !existingColumns.includes('tag')) {
  db.exec('ALTER TABLE tasks RENAME COLUMN client_name TO tag');
}
if (!existingColumns.includes('notes')) {
  db.exec('ALTER TABLE tasks ADD COLUMN notes TEXT');
}

// Migrate the single-value `tag` column into the multi-value `tags` JSON array column.
const columnsBeforeTagsMigration = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
if (!columnsBeforeTagsMigration.includes('tags')) {
  db.exec("ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  if (columnsBeforeTagsMigration.includes('tag')) {
    const rows = db.prepare('SELECT id, tag FROM tasks').all();
    const update = db.prepare('UPDATE tasks SET tags = ? WHERE id = ?');
    const run = db.transaction(() => {
      for (const row of rows) update.run(JSON.stringify(row.tag ? [row.tag] : []), row.id);
    });
    run();
    try {
      db.exec('ALTER TABLE tasks DROP COLUMN tag');
    } catch {
      // Older SQLite builds may not support DROP COLUMN; the now-unused
      // `tag` column is simply left in place, harmless.
    }
  }
}
