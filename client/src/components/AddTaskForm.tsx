import { useState } from 'react';
import type { Category, Priority } from '../types';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function AddTaskForm({
  category,
  onAdd,
}: {
  category: Category;
  onAdd: (input: { text: string; priority: Priority; client_name?: string }) => void;
}) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [clientName, setClientName] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, priority, client_name: clientName.trim() || undefined });
    setText('');
    setPriority('medium');
    setClientName('');
  }

  return (
    <form className="add-task-panel" onSubmit={submit}>
      <input
        className="add-task-text"
        placeholder="Add a task..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="add-task-row">
        <div className="priority-select">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              className={`priority-option ${priority === p ? `selected ${p}` : ''}`}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {category === 'client' && (
          <input
            className="add-task-client"
            placeholder="Client name (optional)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        )}
      </div>
      <div className="add-task-submit-row">
        <button type="submit" className="btn-primary">
          Add Task
        </button>
      </div>
    </form>
  );
}
