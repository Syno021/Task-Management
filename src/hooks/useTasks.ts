import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, Milestone, Comment } from '../types';
import { generateId, getTodayISO, getTomorrowISO } from '../utils/taskUtils';

const STORAGE_KEY = 'planner_tasks';

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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const loaded = loadFromStorage();
    return rollOverTasks(loaded);
  });

  useEffect(() => {
    saveToStorage(tasks);
  }, [tasks]);

  // On mount, roll over overdue tasks
  useEffect(() => {
    setTasks((prev) => {
      const rolled = rollOverTasks(prev);
      return rolled;
    });
  }, []);

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
    return newTask;
  }, []);

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
  }, []);

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
