import { useState } from 'react';
import type { Task, Priority } from '../types';
import Checkbox from './Checkbox';
import PriorityTag, { nextPriority } from './PriorityTag';
import { formatShortDate, isPastDue } from '../utils';

export default function TaskRow({
  task,
  onToggle,
  onPriorityChange,
  onAddSubtask,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  onAddSubtask?: (parentId: string, text: string) => void;
}) {
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskText, setSubtaskText] = useState('');

  const done = task.status === 'done';
  const pastDue = task.status === 'pending' && isPastDue(task.date_created);

  function submitSubtask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = subtaskText.trim();
    if (!trimmed || !onAddSubtask) return;
    onAddSubtask(task.id, trimmed);
    setSubtaskText('');
    setAddingSubtask(false);
  }

  return (
    <>
      <div className={`task-row ${task.is_subtask ? 'subtask' : ''}`}>
        <Checkbox checked={done} onToggle={() => onToggle(task.id)} />
        <div className="task-content">
          <span className={`task-text ${done ? 'done' : ''}`}>{task.text}</span>
          {pastDue && <span className="tag tag-past-due">since {formatShortDate(task.date_created)}</span>}
          <PriorityTag
            priority={task.priority}
            onClick={() => onPriorityChange(task.id, nextPriority(task.priority))}
          />
        </div>
        {!task.is_subtask && onAddSubtask && (
          <button
            type="button"
            className="subtask-add-btn"
            onClick={() => setAddingSubtask((v) => !v)}
            title="Add subtask"
          >
            + subtask
          </button>
        )}
      </div>
      {addingSubtask && (
        <form className="subtask-add-panel" onSubmit={submitSubtask}>
          <input
            className="subtask-add-input"
            autoFocus
            placeholder="Subtask..."
            value={subtaskText}
            onChange={(e) => setSubtaskText(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            Add
          </button>
        </form>
      )}
    </>
  );
}
