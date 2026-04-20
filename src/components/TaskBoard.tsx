import { useState, useEffect } from 'react';
import { Plus, X, ClipboardList, ArrowLeft, Calendar } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { getTomorrowISO, filterTasksByStatus, filterTasksByDate, formatDayHeading, formatDate } from '../utils/taskUtils';

type FilterType = TaskStatus | 'All';

interface NewTaskForm {
  title: string;
  dueDate: string;
  status: TaskStatus;
}

interface TaskBoardProps {
  tasks: Task[];
  filter: FilterType;
  onTaskClick: (task: Task) => void;
  onAddTask: (form: Pick<Task, 'title' | 'dueDate' | 'status'>) => void;
  /** When set, show tasks for this specific date (calendar day-drill-down) */
  dateFilter?: string | null;
  onBackToCalendar?: () => void;
}

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];

const FILTER_LABELS: Record<FilterType, string> = {
  All: 'All Tasks',
  Pending: 'Pending',
  'In Progress': 'In Progress',
  Completed: 'Completed',
  Overdue: 'Overdue',
};

const FILTER_DESCRIPTIONS: Record<FilterType, string> = {
  All: 'Every task in your planner',
  Pending: 'Tasks waiting to be started',
  'In Progress': 'Tasks currently being worked on',
  Completed: 'Tasks you have finished',
  Overdue: 'Tasks past their due date',
};

export default function TaskBoard({
  tasks,
  filter,
  onTaskClick,
  onAddTask,
  dateFilter,
  onBackToCalendar,
}: TaskBoardProps) {
  const isDateMode = !!dateFilter;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTaskForm>({
    title: '',
    dueDate: dateFilter ?? getTomorrowISO(),
    status: 'Pending',
  });

  // When dateFilter changes, update the default due date in the form
  useEffect(() => {
    setForm((p) => ({ ...p, dueDate: dateFilter ?? getTomorrowISO() }));
    setShowForm(false);
  }, [dateFilter]);

  const filtered = isDateMode
    ? filterTasksByDate(tasks, dateFilter!)
    : filterTasksByStatus(tasks, filter);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAddTask({ title: form.title.trim(), dueDate: form.dueDate, status: form.status });
    setForm({ title: '', dueDate: dateFilter ?? getTomorrowISO(), status: 'Pending' });
    setShowForm(false);
  }

  const headerTitle = isDateMode
    ? formatDayHeading(dateFilter!)
    : FILTER_LABELS[filter];

  const headerSub = isDateMode
    ? `${filtered.length} task${filtered.length !== 1 ? 's' : ''} due on ${formatDate(dateFilter!)}`
    : FILTER_DESCRIPTIONS[filter];

  return (
    <main className="flex-1 min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-stone-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-30">

        {/* Back-to-calendar breadcrumb */}
        {isDateMode && onBackToCalendar && (
          <button
            onClick={onBackToCalendar}
            className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium mb-3 transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <Calendar size={13} />
            Back to Calendar
          </button>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-stone-800 mb-1 leading-tight"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {headerTitle}
            </h1>
            <p className="text-sm text-stone-400">{headerSub}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 active:scale-95 flex-shrink-0 ml-4"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* New Task Form */}
      {showForm && (
        <div className="mx-8 mt-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100/50 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-700 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
                Create New Task
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title (required)"
                required
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-stone-400 text-stone-800"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    required
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))}
                    className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-600 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors duration-200 text-sm shadow-sm"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
              <ClipboardList size={28} className="text-stone-300" />
            </div>
            <h3 className="text-stone-500 font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
              No tasks here
            </h3>
            <p className="text-sm text-stone-400 max-w-xs">
              {isDateMode
                ? `Nothing scheduled for this day yet — click "New Task" to get started.`
                : filter === 'All'
                ? 'Click "New Task" to create your first task.'
                : `No ${filter.toLowerCase()} tasks found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
