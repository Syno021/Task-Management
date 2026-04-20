import { useState } from 'react';
import { Plus, Calendar, Check } from 'lucide-react';
import { Milestone } from '../types';

interface MilestoneListProps {
  milestones: Milestone[];
  onToggle: (id: string) => void;
  onAdd: (title: string, targetDate?: string) => void;
}

export default function MilestoneList({ milestones, onToggle, onAdd }: MilestoneListProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd(trimmed, newDate || undefined);
    setNewTitle('');
    setNewDate('');
    setAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setAdding(false);
      setNewTitle('');
      setNewDate('');
    }
  }

  return (
    <div>
      <div className="space-y-2 mb-3">
        {milestones.length === 0 && !adding && (
          <p className="text-sm text-stone-400 italic py-2">No milestones yet.</p>
        )}
        {milestones.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 group py-1"
          >
            <button
              onClick={() => onToggle(m.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                m.completed
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'border-stone-300 hover:border-indigo-400'
              }`}
            >
              {m.completed && <Check size={11} strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm block truncate transition-all ${
                  m.completed ? 'line-through text-stone-400' : 'text-stone-700'
                }`}
              >
                {m.title}
              </span>
              {m.targetDate && (
                <span className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                  <Calendar size={10} />
                  {m.targetDate}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-3 space-y-2">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Milestone title..."
            className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-stone-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-600"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(''); setNewDate(''); }}
              className="px-3 py-2 text-stone-500 text-sm rounded-lg hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors py-1"
        >
          <Plus size={15} />
          Add Milestone
        </button>
      )}
    </div>
  );
}
