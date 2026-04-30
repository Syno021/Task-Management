import { CalendarDays, LayoutGrid, Clock, Play, CheckCircle2, AlertCircle, Image } from 'lucide-react';
import { TaskStatus } from '../types';

export type SidebarView = TaskStatus | 'All' | 'Calendar';

interface NavItem {
  label: SidebarView;
  icon: React.ReactNode;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Calendar', icon: <CalendarDays size={16} />, activeColor: 'bg-indigo-500 text-white' },
  { label: 'All', icon: <LayoutGrid size={16} />, activeColor: 'bg-stone-600 text-white' },
  { label: 'Pending', icon: <Clock size={16} />, activeColor: 'bg-amber-500 text-white' },
  { label: 'In Progress', icon: <Play size={16} />, activeColor: 'bg-blue-500 text-white' },
  { label: 'Completed', icon: <CheckCircle2 size={16} />, activeColor: 'bg-emerald-500 text-white' },
  { label: 'Overdue', icon: <AlertCircle size={16} />, activeColor: 'bg-red-500 text-white' },
];

type FilterCounts = Record<TaskStatus | 'All', number>;

interface SidebarProps {
  view: SidebarView;
  onViewChange: (v: SidebarView) => void;
  counts: FilterCounts;
  onOpenImporter: () => void;
  onSignIn: () => void;
  /** If a calendar date is selected, show it as a sub-label under Calendar */
  activeDateLabel?: string;
}

export default function Sidebar({ view, onViewChange, counts, onOpenImporter, onSignIn, activeDateLabel }: SidebarProps) {
  return (
    <aside className="w-full md:w-64 flex-shrink-0 h-dvh flex flex-col bg-[#1c1917] md:sticky top-0">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-900/50">
            <CalendarDays size={15} className="text-white" />
          </div>
          <span
            className="text-white text-lg font-bold tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Planner
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-stone-800 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-stone-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">
          Views
        </p>
        {NAV_ITEMS.map((item) => {
          const isCalendar = item.label === 'Calendar';
          const isActive = view === item.label || (isCalendar && activeDateLabel && view !== 'Calendar');
          // For non-Calendar items, show count; Calendar shows a special indicator
          const count = item.label !== 'Calendar' ? (counts[item.label as TaskStatus | 'All'] ?? 0) : null;

          return (
            <button
              key={item.label}
              onClick={() => onViewChange(item.label)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? `${item.activeColor} shadow-sm`
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className={`flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className="flex flex-col items-start leading-none">
                  <span>{item.label === 'All' ? 'All Tasks' : item.label}</span>
                  {isCalendar && activeDateLabel && (
                    <span className={`text-[10px] mt-0.5 font-normal truncate max-w-[120px] ${isActive ? 'text-indigo-200' : 'text-stone-500'}`}>
                      {activeDateLabel}
                    </span>
                  )}
                </span>
              </span>
              {count !== null && count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center flex-shrink-0 ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-stone-700 text-stone-400 group-hover:bg-stone-600 group-hover:text-stone-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Import Button */}
      <div className="px-3 pb-6 pt-4 border-t border-stone-800">
        <button
          onClick={onOpenImporter}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-stone-300 hover:text-white bg-stone-800/60 hover:bg-indigo-500/20 border border-stone-700/50 hover:border-indigo-500/40 transition-all duration-200 group"
        >
          <div className="w-7 h-7 rounded-lg bg-stone-700 group-hover:bg-indigo-500/30 flex items-center justify-center transition-colors">
            <Image size={14} className="text-stone-400 group-hover:text-indigo-400" />
          </div>
          <span className="leading-tight">
            Import from Image
            <span className="block text-xs text-stone-500 group-hover:text-indigo-400 font-normal">AI-powered</span>
          </span>
        </button>
        <button
          onClick={onSignIn}
          className="w-full mt-3 px-3 py-3 rounded-xl text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          Sign in
        </button>
      </div>
    </aside>
  );
}
