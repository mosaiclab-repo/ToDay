import { useEffect, useState } from 'react';
import type { Category, Priority } from '../types';
import { api } from '../api';
import TagInput from './TagInput';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function AddTaskForm({
  category,
  onAdd,
}: {
  category: Category;
  onAdd: (input: { text: string; priority: Priority; tag?: string }) => void;
}) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tag, setTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (category !== 'client') return;
    api.getTags().then(setTagSuggestions).catch(() => setTagSuggestions([]));
  }, [category]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const trimmedTag = tag.trim();
    onAdd({ text: trimmed, priority, tag: trimmedTag || undefined });
    if (trimmedTag && !tagSuggestions.includes(trimmedTag)) {
      setTagSuggestions((prev) => [...prev, trimmedTag].sort());
    }
    setText('');
    setPriority('medium');
    setTag('');
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
          <TagInput value={tag} onChange={setTag} suggestions={tagSuggestions} placeholder="Tag (optional)" />
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
