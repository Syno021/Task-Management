import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { getTodayISO, groupTasksByDate, formatCalendarHeader } from '../utils/taskUtils';

interface CalendarViewProps {
  tasks: Task[];
  onDateClick: (dateISO: string) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CHIP: Record<TaskStatus, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-600',
  Overdue: 'bg-red-100 text-red-600',
};

const STATUS_DOT: Record<TaskStatus, string> = {
  Pending: 'bg-amber-400',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Overdue: 'bg-red-500',
};

interface DayCell {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

function buildCalendarCells(year: number, month: number, todayISO: string): DayCell[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  // Leading days from previous month
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const iso = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ iso, day: d, isCurrentMonth: false, isPast: iso < todayISO, isToday: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ iso, day: d, isCurrentMonth: true, isPast: iso < todayISO, isToday: iso === todayISO });
  }

  // Trailing days to complete the grid (always 6 rows = 42 cells)
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  for (let d = 1; cells.length < 42; d++) {
    const iso = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ iso, day: d, isCurrentMonth: false, isPast: false, isToday: false });
  }

  return cells;
}

export default function CalendarView({ tasks, onDateClick }: CalendarViewProps) {
  const todayISO = getTodayISO();
  const todayDate = new Date(todayISO + 'T00:00:00');

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const tasksByDate = groupTasksByDate(tasks);
  const cells = buildCalendarCells(viewYear, viewMonth, todayISO);
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function goToday() {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
  }

  const isCurrentMonthView =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  return (
    <div className="flex-1 flex flex-col bg-[#fafaf9] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-4 bg-white/60 backdrop-blur-sm border-b border-stone-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold text-stone-800"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {formatCalendarHeader(viewYear, viewMonth)}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} across your planner
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToday}
            disabled={isCurrentMonthView}
            className={`px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all duration-150 ${
              isCurrentMonthView
                ? 'text-stone-300 cursor-default'
                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Day-of-week labels ── */}
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 flex-shrink-0 overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px]">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-stone-400 uppercase tracking-widest">
            {d}
          </div>
        ))}
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-auto">
        <div className="grid grid-cols-7 gap-1.5 h-full min-w-[700px]" style={{ gridAutoRows: '1fr' }}>
          {cells.map((cell) => {
            const dayTasks = tasksByDate[cell.iso] ?? [];
            const hasTasks = dayTasks.length > 0;
            // All today + future dates are clickable — past dates are not
            const isClickable = !cell.isPast;
            const visibleTasks = dayTasks.slice(0, 3);
            const overflow = dayTasks.length - visibleTasks.length;

            return (
              <div
                key={cell.iso}
                onClick={() => isClickable && onDateClick(cell.iso)}
                className={[
                  'group relative flex flex-col rounded-2xl border p-2 min-h-[110px] transition-all duration-150',
                  // Base bg
                  cell.isPast
                    ? 'bg-stone-100/60 border-stone-200/50'
                    : cell.isToday
                    ? 'bg-white border-indigo-300 shadow-md shadow-indigo-100/60'
                    : hasTasks
                    ? 'bg-white border-stone-200 shadow-sm'
                    : 'bg-white/50 border-stone-100',
                  // Dim non-current-month
                  !cell.isCurrentMonth ? 'opacity-35' : '',
                  // Hover / clickable
                  isClickable
                    ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 hover:-translate-y-0.5'
                    : 'cursor-default',
                ].join(' ')}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={[
                      'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors',
                      cell.isToday
                        ? 'bg-indigo-500 text-white'
                        : cell.isPast
                        ? 'text-stone-400'
                        : 'text-stone-700',
                    ].join(' ')}
                  >
                    {cell.day}
                  </span>

                  {/* Right-side: Today label OR dot cluster OR add hint */}
                  {cell.isToday ? (
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                      Today
                    </span>
                  ) : hasTasks && !cell.isPast ? (
                    <div className="flex items-center gap-0.5">
                      {dayTasks.slice(0, 4).map((t, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status]}`} />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-[10px] text-stone-400 font-medium ml-0.5">
                          +{dayTasks.length - 4}
                        </span>
                      )}
                    </div>
                  ) : isClickable && !hasTasks ? (
                    /* "+" add hint — visible on hover for empty future dates */
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-500">
                      <Plus size={11} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>

                {/* Task chips */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium truncate leading-tight ${
                        cell.isPast
                          ? 'bg-stone-200 text-stone-500'
                          : STATUS_CHIP[task.status]
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cell.isPast ? 'bg-stone-400' : STATUS_DOT[task.status]}`} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="text-[11px] text-stone-400 font-medium px-1.5 mt-0.5">
                      +{overflow} more
                    </div>
                  )}
                </div>

                {/* Empty-date hover prompt */}
                {isClickable && !hasTasks && (
                  <div className="absolute inset-0 flex items-end justify-center pb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded-2xl">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">
                      Add task
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="px-4 sm:px-8 py-3 border-t border-stone-100 bg-white/40 flex items-center gap-3 sm:gap-5 flex-shrink-0 overflow-x-auto">
        <span className="text-xs text-stone-400 font-medium whitespace-nowrap">Legend:</span>
        {(['Pending', 'In Progress', 'Completed', 'Overdue'] as TaskStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            {s}
          </span>
        ))}
        <span className="hidden md:flex items-center gap-1.5 text-xs text-stone-400 ml-auto whitespace-nowrap">
          <CalendarDays size={12} />
          Click any upcoming date to add or view tasks
        </span>
      </div>
    </div>
  );
}
