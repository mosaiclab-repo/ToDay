import type { Task } from '../types';
import { CATEGORY_LABEL, formatShortDate } from '../utils';

export default function ArchiveView({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <div className="empty-state">Nothing archived yet.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div className="archive-row" key={task.id}>
          <span className="archive-row-text">{task.text}</span>
          <div className="archive-row-meta">
            <span className="cat-tag">{CATEGORY_LABEL[task.category]}</span>
            <span>created {formatShortDate(task.date_created)}</span>
            {task.date_completed && <span>completed {formatShortDate(task.date_completed)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
