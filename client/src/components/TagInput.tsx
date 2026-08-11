import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export default function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  const available = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !value.includes(s))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  function addTag(raw: string) {
    const trimmed = raw.trim();
    setDraft('');
    setOpen(false);
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="tag-input-wrap" ref={wrapRef}>
      <div className="tag-input-field-row">
        {value.map((t) => (
          <span key={t} className="tag-bubble tag-bubble-selected">
            {t}
            <button
              type="button"
              className="tag-bubble-remove"
              onClick={() => removeTag(t)}
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-input-field"
          placeholder={value.length ? '' : placeholder ?? 'Tag'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(draft);
            }
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Backspace' && !draft && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
        />
      </div>
      {open && available.length > 0 && (
        <div className="tag-input-dropdown">
          {available.map((s) => (
            <button
              type="button"
              key={s}
              className="tag-bubble tag-bubble-suggestion"
              onClick={() => addTag(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
