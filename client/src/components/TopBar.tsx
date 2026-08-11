import { useEffect, useState } from 'react';
import { TABS } from '../types';

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

  useEffect(() => {
    const id = setInterval(() => setToday(formatToday(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

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
            <button
              key={tab.key}
              type="button"
              className={`tab-pill ${view === tab.key ? 'active' : ''}`}
              onClick={() => onSelectView(tab.key)}
            >
              {tab.label}
            </button>
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
