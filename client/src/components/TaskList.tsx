import type { Priority, Task } from '../types';
import TaskRow from './TaskRow';

export default function TaskList({
  tasks,
  onToggle,
  onPriorityChange,
  onAddSubtask,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  onAddSubtask: (parentId: string, text: string) => void;
}) {
  if (tasks.length === 0) {
    return <div className="empty-state">Nothing here. Add a task below to get started.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggle={onToggle}
          onPriorityChange={onPriorityChange}
          onAddSubtask={onAddSubtask}
        />
      ))}
    </div>
  );
}
