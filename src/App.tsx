import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import Sidebar, { SidebarView } from './components/Sidebar';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import TaskModal from './components/TaskModal';
import ImageUploadExtractor from './components/ImageUploadExtractor';
import AuthScreen from './components/AuthScreen';
import { useTasks } from './hooks/useTasks';
import { Task, TaskStatus } from './types';
import { countByStatus, formatDate } from './utils/taskUtils';
import { supabase } from './lib/supabaseClient';
import { signOut, upsertProfileForUser } from './lib/auth';

type BoardFilter = TaskStatus | 'All';

export default function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addMilestone,
    toggleMilestone,
    addComment,
    extractAndAddTask,
  } = useTasks({
    authUser,
    onSyncError: (message) => setSyncErrorMessage(message),
  });

  // 'Calendar' = show calendar view; any other value = show task board with that filter
  const [sidebarView, setSidebarView] = useState<SidebarView>('Calendar');
  // When drilling into a specific date from the calendar
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const counts = countByStatus(tasks);
  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;
  const displayName =
    (typeof authUser?.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
    (typeof authUser?.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()) ||
    '';
  const sidebarUser = authUser
    ? {
        fullName: displayName || 'Signed in user',
        email: authUser.email ?? '',
      }
    : null;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) {
        return;
      }
      if (data.user) {
        try {
          await upsertProfileForUser(data.user);
        } catch (error) {
          console.error('Failed to sync profile', error);
          setSyncErrorMessage('We could not sync your profile details. Please try again.');
        }
      }
      setAuthUser(data.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          await upsertProfileForUser(session.user);
        } catch (error) {
          console.error('Failed to sync profile', error);
          setSyncErrorMessage('We could not sync your profile details. Please try again.');
        }
      }
      setAuthUser(session?.user ?? null);
      setIsAuthOpen(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!syncErrorMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSyncErrorMessage('');
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [syncErrorMessage]);

  // Derive what's showing
  const showCalendar = sidebarView === 'Calendar' && calendarDate === null;
  const showBoard = sidebarView !== 'Calendar' || calendarDate !== null;
  const boardFilter: BoardFilter = (sidebarView !== 'Calendar' ? sidebarView : 'All') as BoardFilter;

  function handleViewChange(v: SidebarView) {
    setSidebarView(v);
    setMobileSidebarOpen(false);
    if (v !== 'Calendar') {
      setCalendarDate(null); // Clear date drill-down when switching to a status filter
    } else {
      setCalendarDate(null); // Return to calendar overview
    }
  }

  function handleCalendarDateClick(dateISO: string) {
    setCalendarDate(dateISO);
    // Keep sidebarView as 'Calendar' so the Calendar nav item stays highlighted
    setSidebarView('Calendar');
  }

  function handleBackToCalendar() {
    setCalendarDate(null);
  }

  function handleTaskClick(task: Task) {
    setSelectedTaskId(task.id);
  }

  function handleModalClose() {
    setSelectedTaskId(null);
  }

  function handleDeleteTask(id: string) {
    deleteTask(id);
    setSelectedTaskId(null);
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }
    try {
      setIsSigningOut(true);
      await signOut();
      setAuthUser(null);
      setIsAuthOpen(false);
      setMobileSidebarOpen(false);
    } catch (error) {
      console.error('Failed to sign out', error);
      setSyncErrorMessage('Sign out failed. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#fafaf9]">
      {syncErrorMessage && (
        <div className="fixed top-4 right-4 z-[80] max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
          {syncErrorMessage}
        </div>
      )}
      <div className="hidden md:block">
        <Sidebar
          view={sidebarView}
          onViewChange={handleViewChange}
          counts={counts}
          onOpenImporter={() => setImporterOpen(true)}
          onSignIn={() => setIsAuthOpen(true)}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
          user={sidebarUser}
          activeDateLabel={calendarDate ? formatDate(calendarDate) : undefined}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-[84%] max-w-[300px]">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-3 right-3 z-[60] p-2 rounded-lg text-stone-300 bg-stone-800/80 hover:bg-stone-700 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
            <Sidebar
              view={sidebarView}
              onViewChange={handleViewChange}
              counts={counts}
              onOpenImporter={() => {
                setImporterOpen(true);
                setMobileSidebarOpen(false);
              }}
              onSignIn={() => {
                setIsAuthOpen(true);
                setMobileSidebarOpen(false);
              }}
              onSignOut={handleSignOut}
              isSigningOut={isSigningOut}
              user={sidebarUser}
              activeDateLabel={calendarDate ? formatDate(calendarDate) : undefined}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col">
        <header className="md:hidden px-4 py-3 border-b border-stone-200/70 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <p className="text-sm font-semibold text-stone-700 truncate">
              {calendarDate ? formatDate(calendarDate) : sidebarView}
            </p>
            <span className="w-9" />
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
        {showCalendar && (
          <CalendarView
            tasks={tasks}
            onDateClick={handleCalendarDateClick}
          />
        )}

        {showBoard && (
          <TaskBoard
            tasks={tasks}
            filter={boardFilter}
            onTaskClick={handleTaskClick}
            onAddTask={addTask}
            onOpenImporter={() => setImporterOpen(true)}
            dateFilter={calendarDate}
            onBackToCalendar={calendarDate ? handleBackToCalendar : undefined}
          />
        )}
        </div>
      </div>

      <TaskModal
        task={selectedTask}
        onClose={handleModalClose}
        onUpdate={updateTask}
        onDelete={handleDeleteTask}
        onAddMilestone={addMilestone}
        onToggleMilestone={toggleMilestone}
        onAddComment={addComment}
      />

      <ImageUploadExtractor
        isOpen={importerOpen}
        onClose={() => setImporterOpen(false)}
        onImport={extractAndAddTask}
      />

      {isAuthOpen && (
        <AuthScreen
          onAuthenticated={() => setIsAuthOpen(false)}
          onClose={() => setIsAuthOpen(false)}
        />
      )}
    </div>
  );
}
