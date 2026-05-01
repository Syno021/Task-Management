import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { Task, TaskStatus, Milestone, Comment } from '../types';
import { generateId, getTodayISO, getTomorrowISO } from '../utils/taskUtils';
import { fetchTasksForUser, upsertTaskForUser } from '../lib/taskSync';

const STORAGE_KEY = 'planner_tasks';
const PENDING_SYNC_STORAGE_KEY = 'planner_pending_sync_task_ids';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function ensureUuid(value: string): string {
  return isUuid(value) ? value : crypto.randomUUID();
}

function normalizeTaskIds(task: Task): Task {
  return {
    ...task,
    id: ensureUuid(task.id),
    milestones: task.milestones.map((milestone) => ({
      ...milestone,
      id: ensureUuid(milestone.id),
    })),
    comments: task.comments.map((comment) => ({
      ...comment,
      id: ensureUuid(comment.id),
    })),
  };
}

const SAMPLE_TASK: Task = {
  id: generateId(),
  title: 'Welcome to Planner — your first task!',
  createdDate: getTodayISO(),
  dueDate: getTomorrowISO(),
  status: 'In Progress',
  milestones: [
    { id: generateId(), title: 'Explore the interface', completed: true },
    { id: generateId(), title: 'Create a new task', completed: false },
    { id: generateId(), title: 'Try importing from an image', completed: false },
  ],
  comments: [
    {
      id: generateId(),
      text: 'Click on any task card to open the detail view.',
      createdAt: new Date().toISOString(),
    },
  ],
};

function rollOverTasks(tasks: Task[]): Task[] {
  const today = getTodayISO();
  return tasks.map((task) => {
    if (task.dueDate < today && task.status !== 'Completed') {
      return { ...task, status: 'Overdue' as TaskStatus, dueDate: getTomorrowISO() };
    }
    return task;
  });
}

function loadFromStorage(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [SAMPLE_TASK];
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SAMPLE_TASK];
  } catch {
    return [SAMPLE_TASK];
  }
}

function saveToStorage(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadPendingSyncTaskIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSyncTaskIds(ids: string[]) {
  localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(ids));
}

/** Supabase session storage uses navigator locks; parallel requests often abort losers with AbortError — not a failure. */
function isBenignConcurrencyError(error: unknown): boolean {
  const msg =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : String(error ?? '');
  return (
    /\bAbortError\b/i.test(msg) ||
    /lock broken by another request/i.test(msg) ||
    /request was aborted/i.test(msg)
  );
}

interface UseTasksOptions {
  authUser: User | null;
  onSyncError?: (message: string) => void;
}

export function useTasks({ authUser, onSyncError }: UseTasksOptions) {
  const supabaseChainRef = useRef(Promise.resolve());

  /** Run one Supabase-facing operation after the previous completes to avoid auth storage lock steals (Web Locks API). */
  const enqueueSerialized = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    const chained = supabaseChainRef.current.then(operation);
    supabaseChainRef.current = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }, []);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const loaded = loadFromStorage().map(normalizeTaskIds);
    return rollOverTasks(loaded);
  });
  const [pendingSyncTaskIds, setPendingSyncTaskIds] = useState<string[]>(() =>
    loadPendingSyncTaskIds()
  );

  useEffect(() => {
    saveToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    savePendingSyncTaskIds(pendingSyncTaskIds);
  }, [pendingSyncTaskIds]);

  // On mount, roll over overdue tasks
  useEffect(() => {
    setTasks((prev) => {
      const rolled = rollOverTasks(prev);
      return rolled;
    });
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const remoteTasks = await enqueueSerialized(() => fetchTasksForUser(authUser.id));
        if (cancelled) {
          return;
        }

        const localTaskMap = new Map(tasks.map((task) => [task.id, task]));
        const mergedTasks: Task[] = [...tasks];

        for (const remoteTask of remoteTasks) {
          if (!localTaskMap.has(remoteTask.id)) {
            mergedTasks.push(remoteTask);
          }
        }

        mergedTasks.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
        setTasks(mergedTasks);

        const remoteTaskIds = new Set(remoteTasks.map((task) => task.id));
        const localOnlyTaskIds = tasks
          .filter((task) => !remoteTaskIds.has(task.id))
          .map((task) => task.id);

        if (localOnlyTaskIds.length > 0) {
          setPendingSyncTaskIds((prev) => {
            const merged = new Set([...prev, ...localOnlyTaskIds]);
            return Array.from(merged);
          });
        }
      } catch (error) {
        if (cancelled || isBenignConcurrencyError(error)) {
          return;
        }
        console.error('Failed to fetch tasks from database', error);
        onSyncError?.('Could not fetch cloud tasks. Showing local data for now.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, enqueueSerialized, onSyncError]);

  const syncTaskToCloud = useCallback(
    async (task: Task) => {
      if (!authUser) {
        setPendingSyncTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
        return;
      }

      try {
        await enqueueSerialized(() => upsertTaskForUser(task, authUser.id));
        setPendingSyncTaskIds((prev) => prev.filter((id) => id !== task.id));
      } catch (error) {
        setPendingSyncTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
        if (isBenignConcurrencyError(error)) {
          return;
        }
        console.error('Failed to sync task to database', error);
        onSyncError?.('Task was saved locally and will sync when your connection is stable.');
      }
    },
    [authUser, enqueueSerialized, onSyncError]
  );

  useEffect(() => {
    if (!authUser || pendingSyncTaskIds.length === 0) {
      return;
    }

    const pendingTasks = tasks.filter((task) => pendingSyncTaskIds.includes(task.id));
    if (pendingTasks.length === 0) {
      setPendingSyncTaskIds([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const successfullySynced: string[] = [];
      for (const task of pendingTasks) {
        try {
          await enqueueSerialized(() => upsertTaskForUser(task, authUser.id));
          successfullySynced.push(task.id);
        } catch (error) {
          if (!isBenignConcurrencyError(error)) {
            console.error('Failed to sync pending task', error);
          }
        }
      }

      if (cancelled || successfullySynced.length === 0) {
        return;
      }

      setPendingSyncTaskIds((prev) => prev.filter((id) => !successfullySynced.includes(id)));
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, enqueueSerialized, pendingSyncTaskIds, tasks]);

  const addTask = useCallback((partial: Pick<Task, 'title' | 'dueDate' | 'status'>) => {
    const newTask: Task = {
      id: generateId(),
      title: partial.title,
      createdDate: getTodayISO(),
      dueDate: partial.dueDate,
      status: partial.status,
      milestones: [],
      comments: [],
    };
    setTasks((prev) => [newTask, ...prev]);
    void syncTaskToCloud(newTask);
    return newTask;
  }, [syncTaskToCloud]);

  const updateTask = useCallback((id: string, changes: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addMilestone = useCallback(
    (taskId: string, title: string, targetDate?: string) => {
      const milestone: Milestone = {
        id: generateId(),
        title,
        targetDate,
        completed: false,
      };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, milestones: [...t.milestones, milestone] } : t
        )
      );
    },
    []
  );

  const toggleMilestone = useCallback((taskId: string, milestoneId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? (() => {
              const milestones = t.milestones.map((m) =>
                m.id === milestoneId ? { ...m, completed: !m.completed } : m
              );
              const completedCount = milestones.filter((m) => m.completed).length;
              const allCompleted = milestones.length > 0 && completedCount === milestones.length;
              const hasAnyCompleted = completedCount > 0;

              let status: TaskStatus = t.status;
              if (allCompleted) {
                status = 'Completed';
              } else if (hasAnyCompleted) {
                status = 'In Progress';
              } else if (t.status === 'Completed' || t.status === 'In Progress') {
                status = 'Pending';
              }

              return {
                ...t,
                status,
                milestones,
              };
            })()
          : t
      )
    );
  }, []);

  const addComment = useCallback((taskId: string, text: string) => {
    const comment: Comment = {
      id: generateId(),
      text,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t
      )
    );
  }, []);

  const extractAndAddTask = useCallback((partial: Partial<Task>) => {
    const milestoneTitles = (partial.milestones ?? [])
      .map((m) => m.title?.trim())
      .filter((title): title is string => Boolean(title));

    const newTask: Task = {
      id: generateId(),
      title: partial.title?.trim() || 'Untitled Task',
      createdDate: getTodayISO(),
      dueDate: partial.dueDate ?? getTomorrowISO(),
      status: (partial.status as TaskStatus) ?? 'Pending',
      milestones: milestoneTitles.map((title) => ({
        id: generateId(),
        title,
        completed: false,
      })),
      comments: [],
    };

    setTasks((prev) => [newTask, ...prev]);
    void syncTaskToCloud(newTask);
  }, [syncTaskToCloud]);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addMilestone,
    toggleMilestone,
    addComment,
    extractAndAddTask,
  };
}
