import { useState } from 'react';
import Sidebar, { SidebarView } from './components/Sidebar';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import TaskModal from './components/TaskModal';
import ImageUploadExtractor from './components/ImageUploadExtractor';
import { useTasks } from './hooks/useTasks';
import { Task, TaskStatus } from './types';
import { countByStatus, formatDate } from './utils/taskUtils';

type BoardFilter = TaskStatus | 'All';

export default function App() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addMilestone,
    toggleMilestone,
    addComment,
    extractAndAddTasks,
  } = useTasks();

  // 'Calendar' = show calendar view; any other value = show task board with that filter
  const [sidebarView, setSidebarView] = useState<SidebarView>('Calendar');
  // When drilling into a specific date from the calendar
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);

  const counts = countByStatus(tasks);
  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  // Derive what's showing
  const showCalendar = sidebarView === 'Calendar' && calendarDate === null;
  const showBoard = sidebarView !== 'Calendar' || calendarDate !== null;
  const boardFilter: BoardFilter = (sidebarView !== 'Calendar' ? sidebarView : 'All') as BoardFilter;

  function handleViewChange(v: SidebarView) {
    setSidebarView(v);
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        view={sidebarView}
        onViewChange={handleViewChange}
        counts={counts}
        onOpenImporter={() => setImporterOpen(true)}
        activeDateLabel={calendarDate ? formatDate(calendarDate) : undefined}
      />

      <div className="flex-1 overflow-y-auto flex">
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
            dateFilter={calendarDate}
            onBackToCalendar={calendarDate ? handleBackToCalendar : undefined}
          />
        )}
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
        onImport={extractAndAddTasks}
      />
    </div>
  );
}
