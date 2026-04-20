import { TaskStatus } from '../types';
import { getStatusColor, getStatusDot } from '../utils/taskUtils';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const dotClass = getStatusDot(status);
  const textSize = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${colorClass} ${textSize}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {status}
    </span>
  );
}
