import { useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export default function InfoPopover() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  return (
    <div className="info-popover-wrap" ref={wrapRef}>
      <button
        type="button"
        className="info-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick tips"
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="info-popover" role="tooltip">
          <div className="info-popover-header">
            <span className="info-popover-title">Quick tips</span>
            <button
              type="button"
              className="info-popover-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <ul className="info-popover-list">
            <li>Tap a tab name to rename it — make it yours.</li>
            <li>Tap Refresh Day to send finished tasks to your Archive and start fresh.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
