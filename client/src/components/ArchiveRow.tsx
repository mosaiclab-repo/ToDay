import { useState } from 'react';
import type { Task } from '../types';
import { CATEGORY_LABEL, formatShortDate } from '../utils';

export default function ArchiveRow({
  task,
  onReopen,
  onSaveNotes,
  onRequestDelete,
}: {
  task: Task;
  onReopen: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onRequestDelete: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.notes ?? '');

  function startEdit() {
    setNotesDraft(task.notes ?? '');
    setEditing(true);
  }

  function save() {
    onSaveNotes(task.id, notesDraft);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  return (
    <div className="archive-row">
      <span className="archive-row-text">{task.text}</span>
      <div className="archive-row-meta">
        <span className="cat-tag">{CATEGORY_LABEL[task.category]}</span>
        <span>created {formatShortDate(task.date_created)}</span>
        {task.date_completed && <span>completed {formatShortDate(task.date_completed)}</span>}
      </div>

      {!editing && task.notes && <p className="archive-row-notes">{task.notes}</p>}

      {editing && (
        <div className="archive-notes-edit">
          <input
            className="archive-notes-input"
            autoFocus
            placeholder="Add a note..."
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
          />
          <button type="button" className="btn-secondary" onClick={save}>
            Save
          </button>
          <button type="button" className="btn-secondary" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      <div className="archive-row-actions">
        <button type="button" className="btn-secondary" onClick={() => onReopen(task.id)}>
          Reopen
        </button>
        <button type="button" className="btn-secondary" onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="btn-danger" onClick={() => onRequestDelete(task)}>
          Delete
        </button>
      </div>
    </div>
  );
}
