import type { Task } from '../types';
import ArchiveRow from './ArchiveRow';

export default function ArchiveView({
  tasks,
  onReopen,
  onSaveNotes,
  onRequestDelete,
}: {
  tasks: Task[];
  onReopen: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onRequestDelete: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <div className="empty-state">Nothing archived yet.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <ArchiveRow
          key={task.id}
          task={task}
          onReopen={onReopen}
          onSaveNotes={onSaveNotes}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </div>
  );
}
