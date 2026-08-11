import type { Priority } from '../types';

const CYCLE: Priority[] = ['high', 'medium', 'low'];

export function nextPriority(p: Priority): Priority {
  const idx = CYCLE.indexOf(p);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export default function PriorityTag({
  priority,
  onClick,
}: {
  priority: Priority;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`tag tag-priority ${priority}`}
      onClick={onClick}
      title="Tap to change priority"
    >
      {priority}
    </button>
  );
}
