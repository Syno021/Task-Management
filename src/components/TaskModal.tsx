import { useState, useEffect, useRef } from 'react';
import { X, Trash2, MessageCircle, Send, Clock } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import MilestoneList from './MilestoneList';
import StatusBadge from './StatusBadge';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAddMilestone: (taskId: string, title: string, targetDate?: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onAddComment: (taskId: string, text: string) => void;
}

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function TaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  onAddMilestone,
  onToggleMilestone,
  onAddComment,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [commentText, setCommentText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visible, setVisible] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDueDate(task.dueDate);
      setStatus(task.status);
      setShowDeleteConfirm(false);
      setCommentText('');
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [task]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function handleTitleBlur() {
    if (!task) return;
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    }
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDueDate(e.target.value);
    if (!task) return;
    onUpdate(task.id, { dueDate: e.target.value });
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const s = e.target.value as TaskStatus;
    setStatus(s);
    if (!task) return;
    onUpdate(task.id, { status: s });
  }

  function handleAddComment() {
    const trimmed = commentText.trim();
    if (!trimmed || !task) return;
    onAddComment(task.id, trimmed);
    setCommentText('');
  }

  function handleDelete() {
    if (!task) return;
    onDelete(task.id);
    handleClose();
  }

  if (!task) return null;

  const done = task.milestones.filter((m) => m.completed).length;
  const total = task.milestones.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {total > 0 && (
              <span className="text-xs text-stone-400 font-medium">
                {done}/{total} milestones
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-xl font-semibold text-stone-800 bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-indigo-400 focus:outline-none py-1 transition-colors placeholder-stone-300"
              placeholder="Task title"
              style={{ fontFamily: 'Syne, sans-serif' }}
            />
          </div>

          {/* Due Date & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={handleDueDateChange}
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <select
                value={status}
                onChange={handleStatusChange}
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-700 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Milestones
            </h3>
            <MilestoneList
              milestones={task.milestones}
              onToggle={(milestoneId) => onToggleMilestone(task.id, milestoneId)}
              onAdd={(title, targetDate) => onAddMilestone(task.id, title, targetDate)}
            />
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MessageCircle size={13} />
              Comments
              {task.comments.length > 0 && (
                <span className="bg-stone-100 text-stone-500 text-xs rounded-full px-1.5 py-0.5">
                  {task.comments.length}
                </span>
              )}
            </h3>

            {task.comments.length === 0 && (
              <p className="text-sm text-stone-400 italic mb-3">No comments yet.</p>
            )}

            <div className="space-y-3 mb-4">
              {task.comments.map((c) => (
                <div key={c.id} className="bg-stone-50 rounded-xl p-3">
                  <p className="text-sm text-stone-700 leading-relaxed">{c.text}</p>
                  <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
                    <Clock size={10} />
                    {formatCommentDate(c.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-stone-400"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-sm text-red-700 flex-1">Delete this task?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-stone-500 text-sm rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 font-medium transition-colors py-1"
            >
              <Trash2 size={15} />
              Delete Task
            </button>
          )}
        </div>
      </div>
    </>
  );
}
