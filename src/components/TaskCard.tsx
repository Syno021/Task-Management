import { Calendar, MessageCircle, CheckSquare } from 'lucide-react';
import { Task } from '../types';
import StatusBadge from './StatusBadge';
import { formatDate, getMilestoneProgress } from '../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { done, total } = getMilestoneProgress(task);
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-stone-800 text-sm leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
          {task.title}
        </h3>
        <StatusBadge status={task.status} size="sm" />
      </div>

      <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-3">
        <Calendar size={12} />
        <span>{formatDate(task.dueDate)}</span>
      </div>

      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare size={11} />
              {done}/{total} milestones
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {task.comments.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-stone-400">
          <MessageCircle size={11} />
          <span>{task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </button>
  );
}
