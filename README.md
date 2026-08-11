# ToDay

A live, honest, daily task tracker. Three tabs (Client Work, Business Ops, Personal), a manual **Refresh Day** action instead of an automatic midnight reset, and an append-only Archive that keeps a full history of completed work.

See `docs` in the original spec for the full product rationale — this README only covers running the app.

## Stack

- **Server**: Node.js + Express + better-sqlite3 (`server/`)
- **Client**: React + TypeScript + Vite (`client/`)

The client talks to the server over `/api`, proxied by Vite in dev.

## Running locally

```bash
npm install          # installs both workspaces
npm run dev           # runs server (port 4000) and client (port 5173) together
```

Then open the printed client URL (e.g. `http://localhost:5173`).

Run them separately if you prefer:

```bash
npm run dev:server    # http://localhost:4000
npm run dev:client    # http://localhost:5173
```

## Data

SQLite database lives at `server/data/today.db` (created automatically, gitignored). Delete it to reset to a clean slate.

## Building for production

```bash
npm run build          # builds the client into client/dist
npm run dev:server     # or `node server/src/index.js` to run the API
```

Serve `client/dist` with any static host, pointed at a reverse proxy for `/api` → the server process.

## What's implemented

- Task data model exactly as specified (`Task`, `DayRefreshLog`), including fields not yet surfaced in the UI (`time_created`, `time_completed`, `reopen_count`) which are stored for future reporting.
- Three category tabs + secondary Archive link, current date sourced from the device clock.
- In-place checkbox completion (strike-through + fade, no list reordering).
- Automatic past-due tagging (`since Jul 29`) computed client-side from the device's current date.
- Manual **Refresh Day**: confirmation modal → archives done tasks, leaves pending tasks untouched, logs a `DayRefreshLog` row every time (including no-op double taps).
- Subtasks: inline "+ subtask" action per parent row, indented rendering, independent completion (parent never auto-completes).
- Priority is editable anytime by tapping its tag (cycles high → medium → low).
- Read-only Archive, sorted most-recently-completed first.
- Glassmorphism dark visual design per the exact spec values (colors, blur, radii, spacing, typography).
