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
    client_name TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'archived')),
    date_created TEXT NOT NULL,
    time_created TEXT NOT NULL,
    date_completed TEXT,
    time_completed TEXT,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    is_subtask INTEGER NOT NULL DEFAULT 0,
    parent_task_id TEXT REFERENCES tasks(id)
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
