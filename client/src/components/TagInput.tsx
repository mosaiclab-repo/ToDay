import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export default function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const matches = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions;
    // Don't show a suggestion that's already an exact match for the current input.
    return matches.filter((s) => s.toLowerCase() !== q).slice(0, 8);
  }, [value, suggestions]);

  function selectSuggestion(s: string) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div className="tag-input-wrap" ref={wrapRef}>
      <input
        className="add-task-client"
        placeholder={placeholder ?? 'Tag (optional)'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="tag-input-dropdown">
          {filtered.map((s) => (
            <button
              type="button"
              key={s}
              className="tag-input-option"
              onClick={() => selectSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
