import { Task, TaskStatus } from '../types';

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function getDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Overdue':
      return 'bg-red-100 text-red-700 border-red-200';
  }
}

export function getStatusDot(status: TaskStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-400';
    case 'In Progress':
      return 'bg-blue-500';
    case 'Completed':
      return 'bg-emerald-500';
    case 'Overdue':
      return 'bg-red-500';
  }
}

export function getMilestoneProgress(task: Task): { done: number; total: number } {
  const total = task.milestones.length;
  const done = task.milestones.filter((m) => m.completed).length;
  return { done, total };
}

export function filterTasksByStatus(tasks: Task[], filter: TaskStatus | 'All'): Task[] {
  if (filter === 'All') return tasks;
  return tasks.filter((t) => t.status === filter);
}

export function filterTasksByDate(tasks: Task[], dateISO: string): Task[] {
  return tasks.filter((t) => t.dueDate === dateISO);
}

export function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!map[task.dueDate]) map[task.dueDate] = [];
    map[task.dueDate].push(task);
  }
  return map;
}

export function formatCalendarHeader(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDayHeading(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function countByStatus(tasks: Task[]): Record<TaskStatus | 'All', number> {
  return {
    All: tasks.length,
    Pending: tasks.filter((t) => t.status === 'Pending').length,
    'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
    Completed: tasks.filter((t) => t.status === 'Completed').length,
    Overdue: tasks.filter((t) => t.status === 'Overdue').length,
  };
}
