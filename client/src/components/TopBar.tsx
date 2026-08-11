import { useEffect, useState } from 'react';
import { TABS } from '../types';
import type { Category } from '../types';
import { useTabLabels } from '../hooks/useTabLabels';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatToday(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function TopBar({
  view,
  onSelectView,
  onRefreshDay,
}: {
  view: string;
  onSelectView: (v: string) => void;
  onRefreshDay: () => void;
}) {
  const [today, setToday] = useState(() => formatToday(new Date()));
  const { getLabel, setLabel } = useTabLabels();
  const [editingKey, setEditingKey] = useState<Category | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const id = setInterval(() => setToday(formatToday(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleTabClick(key: Category) {
    if (view === key) {
      // Tapping the tab you're already on renames it, per the app's own tip copy.
      setEditingKey(key);
      setDraft(getLabel(key));
    } else {
      onSelectView(key);
    }
  }

  function saveEdit() {
    if (editingKey) setLabel(editingKey, draft);
    setEditingKey(null);
  }

  return (
    <div className="top-bar">
      <div className="top-bar-row">
        <span className="date-label">{today}</span>
        <button type="button" className="btn-primary" onClick={onRefreshDay}>
          Refresh Day
        </button>
      </div>
      <div className="top-bar-row">
        <div className="tab-bar">
          {TABS.map((tab) => (
            editingKey === tab.key ? (
              <input
                key={tab.key}
                className="tab-pill-edit"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') setEditingKey(null);
                }}
              />
            ) : (
              <button
                key={tab.key}
                type="button"
                className={`tab-pill ${view === tab.key ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.key)}
                title={view === tab.key ? 'Tap again to rename' : undefined}
              >
                {getLabel(tab.key)}
              </button>
            )
          ))}
          <button
            type="button"
            className={`archive-link ${view === 'archive' ? 'active' : ''}`}
            onClick={() => onSelectView('archive')}
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
