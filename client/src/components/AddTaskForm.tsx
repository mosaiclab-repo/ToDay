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
  onAdd: (input: { text: string; priority: Priority; tags?: string[] }) => void;
}) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (category !== 'client') return;
    api.getTags().then(setTagSuggestions).catch(() => setTagSuggestions([]));
  }, [category]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, priority, tags: tags.length ? tags : undefined });
    const newTags = tags.filter((t) => !tagSuggestions.includes(t));
    if (newTags.length) {
      setTagSuggestions((prev) => [...prev, ...newTags].sort());
    }
    setText('');
    setPriority('medium');
    setTags([]);
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
          <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} placeholder="Tag" />
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
