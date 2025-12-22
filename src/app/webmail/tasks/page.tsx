'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import { Calendar, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TasksHeader, TasksSidebar, TasksList } from '@/components/webmail/tasks';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  starred: boolean;
  listId: string;
  subtasks?: Task[];
}

interface TaskList {
  id: string;
  name: string;
  enabled: boolean;
}

export default function WebmailTasksPage() {
  const { session } = useWebmailSession();
  const router = useRouter();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([
    { id: 'default', name: 'Meine Aufgaben', enabled: true },
  ]);
  const [selectedView, setSelectedView] = useState<'all' | 'starred'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortOrder, setSortOrder] = useState<'date' | 'custom' | 'title'>('custom');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    starred: false,
    listId: 'default',
  });
  const [newListName, setNewListName] = useState('');

  const loadTasks = useCallback(() => {
    if (!session?.email) return;
    
    try {
      const storageKey = `webmail_tasks_${session.email}`;
      const savedTasks = localStorage.getItem(storageKey);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      
      const listsKey = `webmail_task_lists_${session.email}`;
      const savedLists = localStorage.getItem(listsKey);
      if (savedLists) {
        setTaskLists(JSON.parse(savedLists));
      }
    } catch {
      // Silently handle errors
    }
  }, [session?.email]);

  useEffect(() => {
    if (!session?.isAuthenticated) {
      router.push('/webmail');
      return;
    }
    loadTasks();
  }, [session, router, loadTasks]);

  const saveTasks = (newTasks: Task[]) => {
    if (!session?.email) return;
    const storageKey = `webmail_tasks_${session.email}`;
    localStorage.setItem(storageKey, JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const saveTaskLists = (newLists: TaskList[]) => {
    if (!session?.email) return;
    const listsKey = `webmail_task_lists_${session.email}`;
    localStorage.setItem(listsKey, JSON.stringify(newLists));
    setTaskLists(newLists);
  };

  // Inline task creation from TasksList
  const handleInlineCreateTask = (taskData: { title: string; description?: string; dueDate?: string; starred: boolean }) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      dueDate: taskData.dueDate,
      completed: false,
      starred: taskData.starred,
      listId: getCurrentListId(),
    };

    const newTasks = [...tasks, newTask];
    saveTasks(newTasks);
    toast.success('Aufgabe erstellt');
  };

  const getCurrentListId = () => {
    // Return the first enabled list or 'default'
    const enabledList = taskLists.find((l) => l.enabled);
    return enabledList?.id || 'default';
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setTaskForm({
      title: '',
      description: '',
      dueDate: '',
      starred: false,
      listId: getCurrentListId(),
    });
    setShowTaskModal(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || '',
      starred: task.starred,
      listId: task.listId,
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }

    const taskData: Task = {
      id: selectedTask?.id || `task-${Date.now()}`,
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate,
      completed: selectedTask?.completed || false,
      starred: taskForm.starred,
      listId: taskForm.listId,
    };

    let newTasks: Task[];
    if (selectedTask) {
      newTasks = tasks.map((t) => (t.id === selectedTask.id ? taskData : t));
      toast.success('Aufgabe aktualisiert');
    } else {
      newTasks = [...tasks, taskData];
      toast.success('Aufgabe erstellt');
    }

    saveTasks(newTasks);
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    const newTasks = tasks.filter((t) => t.id !== selectedTask.id);
    saveTasks(newTasks);
    setShowTaskModal(false);
    setSelectedTask(null);
    toast.success('Aufgabe gelöscht');
  };

  const handleTaskComplete = (taskId: string) => {
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    saveTasks(newTasks);
  };

  const handleTaskStar = (taskId: string) => {
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, starred: !t.starred } : t
    );
    saveTasks(newTasks);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    saveTasks(newTasks);
    toast.success('Aufgabe aktualisiert');
  };

  const handleInlineDeleteTask = (taskId: string) => {
    const newTasks = tasks.filter((t) => t.id !== taskId);
    saveTasks(newTasks);
    toast.success('Aufgabe gelöscht');
  };

  const handleCreateList = () => {
    setNewListName('');
    setShowListModal(true);
  };

  const handleSaveList = () => {
    if (!newListName.trim()) {
      toast.error('Bitte gib einen Namen ein');
      return;
    }

    const newList: TaskList = {
      id: `list-${Date.now()}`,
      name: newListName,
      enabled: true,
    };

    saveTaskLists([...taskLists, newList]);
    setShowListModal(false);
    toast.success('Liste erstellt');
  };

  const handleTaskListToggle = (listId: string) => {
    const newLists = taskLists.map((l) =>
      l.id === listId ? { ...l, enabled: !l.enabled } : l
    );
    saveTaskLists(newLists);
  };

  // Filter and sort tasks
  const getFilteredTasks = () => {
    let filtered = tasks.filter((t) => !t.completed);

    // Filter by view
    if (selectedView === 'starred') {
      filtered = filtered.filter((t) => t.starred);
    }

    // Filter by enabled lists
    const enabledListIds = taskLists.filter((l) => l.enabled).map((l) => l.id);
    filtered = filtered.filter((t) => enabledListIds.includes(t.listId));

    // Sort
    switch (sortOrder) {
      case 'date':
        filtered.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title, 'de'));
        break;
      default:
        // custom order - keep as is
        break;
    }

    return filtered;
  };

  const getCompletedTasks = () => {
    let completed = tasks.filter((t) => t.completed);

    if (selectedView === 'starred') {
      completed = completed.filter((t) => t.starred);
    }

    const enabledListIds = taskLists.filter((l) => l.enabled).map((l) => l.id);
    completed = completed.filter((t) => enabledListIds.includes(t.listId));

    return completed;
  };

  const currentListName = selectedView === 'starred' ? 'Markiert' : 'Meine Aufgaben';

  return (
    <div className="h-screen flex flex-col bg-[#202124]">
      {/* Header */}
      <TasksHeader
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={session?.email || ''}
        onLogout={() => router.push('/webmail')}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <TasksSidebar
          isCollapsed={!sidebarOpen}
          selectedView={selectedView}
          onViewChange={setSelectedView}
          taskLists={taskLists}
          onTaskListToggle={handleTaskListToggle}
          onCreateTask={handleCreateTask}
          onCreateList={handleCreateList}
        />

        {/* Tasks List */}
        <TasksList
          listName={currentListName}
          tasks={getFilteredTasks()}
          completedTasks={getCompletedTasks()}
          onTaskClick={handleTaskClick}
          onTaskComplete={handleTaskComplete}
          onTaskStar={handleTaskStar}
          onAddTask={handleInlineCreateTask}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleInlineDeleteTask}
          showCompleted={showCompleted}
          onToggleShowCompleted={() => setShowCompleted(!showCompleted)}
          currentListId={getCurrentListId()}
        />
      </div>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
            </DialogTitle>
            <DialogDescription>
              {selectedTask ? 'Bearbeite die Details der Aufgabe' : 'Erstelle eine neue Aufgabe'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Aufgabe eingeben"
              />
            </div>

            <div>
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Details hinzufügen"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="dueDate"
                  type="date"
                  className="pl-9"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTaskForm({ ...taskForm, starred: !taskForm.starred })}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Star
                  className={`h-5 w-5 ${
                    taskForm.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                {taskForm.starred ? 'Markiert' : 'Nicht markiert'}
              </span>
            </div>

            {taskLists.length > 1 && (
              <div>
                <Label htmlFor="listId">Liste</Label>
                <select
                  id="listId"
                  value={taskForm.listId}
                  onChange={(e) => setTaskForm({ ...taskForm, listId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {taskLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {selectedTask && (
              <Button variant="destructive" onClick={handleDeleteTask}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveTask}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create List Modal */}
      <Dialog open={showListModal} onOpenChange={setShowListModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Neue Liste erstellen</DialogTitle>
            <DialogDescription>
              Gib einen Namen für die neue Aufgabenliste ein
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="listName">Listenname</Label>
            <Input
              id="listName"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="z.B. Arbeit, Privat, Einkaufen..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveList}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
