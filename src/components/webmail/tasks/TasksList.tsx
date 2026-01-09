'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Star, MoreVertical, ChevronDown, ChevronRight, Calendar, Repeat, AlignLeft, X, Trash2, Check, CornerDownRight, ListPlus, Clock } from 'lucide-react';
import { TaskDatePicker } from './TaskDatePicker';
import { TaskRepeatPicker } from './TaskRepeatPicker';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface RepeatConfig {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  time?: string;
  startDate: string;
  endType: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  repeat?: RepeatConfig;
  completed: boolean;
  starred: boolean;
  listId: string;
  subtasks?: Task[];
}

interface NewTaskForm {
  title: string;
  description: string;
  dueDate: string;
  repeat?: RepeatConfig;
  starred: boolean;
}

interface TasksListProps {
  listName: string;
  tasks: Task[];
  completedTasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskStar: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'listId'>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
  currentListId: string;
}

export function TasksList({
  listName,
  tasks,
  completedTasks,
  onTaskClick,
  onTaskComplete,
  onTaskStar,
  onAddTask,
  onTaskUpdate,
  onTaskDelete,
  showCompleted,
  onToggleShowCompleted,
  currentListId: _currentListId,
}: TasksListProps) {
  const { isDark } = useWebmailTheme();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showListMenu, setShowListMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'custom' | 'date' | 'dueDate' | 'starred' | 'title'>('custom');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditRepeatPicker, setShowEditRepeatPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);
  const _menuButtonRef = useRef<HTMLButtonElement>(null);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    title: '',
    description: '',
    dueDate: '',
    repeat: undefined,
    starred: false,
  });
  const [editForm, setEditForm] = useState<NewTaskForm>({
    title: '',
    description: '',
    dueDate: '',
    repeat: undefined,
    starred: false,
  });
  const [, setShowDescription] = useState(false);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const editTitleInputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  // Focus title input when adding task
  useEffect(() => {
    if (isAddingTask && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isAddingTask]);

  // Focus edit input when editing task
  useEffect(() => {
    if (editingTaskId && editTitleInputRef.current) {
      editTitleInputRef.current.focus();
    }
  }, [editingTaskId]);

  // Close form on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        if (newTaskForm.title.trim()) {
          handleSaveTask();
        } else {
          setIsAddingTask(false);
          resetForm();
        }
      }
    };

    if (isAddingTask) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddingTask, newTaskForm]);

  // Close edit form on outside click
  useEffect(() => {
    const handleEditClickOutside = (event: MouseEvent) => {
      if (editFormRef.current && !editFormRef.current.contains(event.target as Node)) {
        if (editForm.title.trim()) {
          handleSaveEdit();
        } else {
          cancelEdit();
        }
      }
    };

    if (editingTaskId) {
      document.addEventListener('mousedown', handleEditClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleEditClickOutside);
  }, [editingTaskId, editForm]);

  // Close menu on outside click
  useEffect(() => {
    const handleMenuClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenTaskId(null);
      }
    };

    if (menuOpenTaskId) {
      document.addEventListener('mousedown', handleMenuClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleMenuClickOutside);
  }, [menuOpenTaskId]);

  // Close list menu on outside click
  useEffect(() => {
    const handleListMenuClickOutside = (event: MouseEvent) => {
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setShowListMenu(false);
      }
    };

    if (showListMenu) {
      document.addEventListener('mousedown', handleListMenuClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleListMenuClickOutside);
  }, [showListMenu]);

  const resetForm = () => {
    setNewTaskForm({ title: '', description: '', dueDate: '', repeat: undefined, starred: false });
    setShowDescription(false);
  };

  const handleSaveTask = () => {
    if (!newTaskForm.title.trim()) return;

    onAddTask({
      title: newTaskForm.title.trim(),
      description: newTaskForm.description.trim() || undefined,
      dueDate: newTaskForm.dueDate || undefined,
      repeat: newTaskForm.repeat,
      starred: newTaskForm.starred,
    });

    resetForm();
    setIsAddingTask(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveTask();
    }
    if (e.key === 'Escape') {
      setIsAddingTask(false);
      resetForm();
    }
  };

  // Edit task functions
  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || '',
      repeat: task.repeat,
      starred: task.starred,
    });
    setIsAddingTask(false); // Close add form if open
  };

  const handleSaveEdit = () => {
    if (!editingTaskId || !editForm.title.trim()) return;
    
    onTaskUpdate?.(editingTaskId, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || undefined,
      dueDate: editForm.dueDate || undefined,
      repeat: editForm.repeat,
      starred: editForm.starred,
    });
    
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({ title: '', description: '', dueDate: '', repeat: undefined, starred: false });
    setShowEditDatePicker(false);
    setShowEditRepeatPicker(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Save current task and create new one
      if (editForm.title.trim()) {
        handleSaveEdit();
        // Start adding a new task
        setIsAddingTask(true);
      }
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const _handleDeleteCurrentTask = () => {
    if (!editingTaskId) return;
    onTaskDelete?.(editingTaskId);
    cancelEdit();
  };

  // Date comparison helpers
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  
  const isToday = newTaskForm.dueDate === todayStr;
  const isTomorrow = newTaskForm.dueDate === tomorrowStr;
  const isCustomDate = newTaskForm.dueDate && !isToday && !isTomorrow;

  const setDueToday = () => {
    setNewTaskForm({ ...newTaskForm, dueDate: todayStr });
  };

  const setDueTomorrow = () => {
    setNewTaskForm({ ...newTaskForm, dueDate: tomorrowStr });
  };

  const formatDueDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    }
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const _formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    }
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  const _isOverdue = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handlePrintList = () => {
    setShowListMenu(false);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${listName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          .task { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
          .checkbox { width: 18px; height: 18px; border: 2px solid #666; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
          .checkbox.completed { background: #14b8a6; border-color: #14b8a6; }
          .content { flex: 1; }
          .title { font-size: 14px; }
          .title.completed { text-decoration: line-through; color: #999; }
          .due-date { font-size: 12px; color: #666; margin-top: 4px; }
          .section-title { font-size: 12px; color: #666; margin-top: 20px; margin-bottom: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${listName}</h1>
        ${tasks.map(task => `
          <div class="task">
            <div class="checkbox"></div>
            <div class="content">
              <div class="title">${task.title}</div>
              ${task.dueDate ? `<div class="due-date">${formatDueDateDisplay(task.dueDate)}</div>` : ''}
            </div>
          </div>
        `).join('')}
        ${completedTasks.length > 0 ? `
          <div class="section-title">Erledigt (${completedTasks.length})</div>
          ${completedTasks.map(task => `
            <div class="task">
              <div class="checkbox completed"></div>
              <div class="content">
                <div class="title completed">${task.title}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className={`flex-1 ${isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'} overflow-auto flex flex-col items-center py-8`}>
      {/* Centered Card Container */}
      <div className={`w-full max-w-2xl ${isDark ? 'bg-[#292a2d]' : 'bg-white'} rounded-2xl shadow-xl overflow-visible`}>
        {/* List Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'}`}>{listName}</h1>
            <div className="relative">
              <button 
                onClick={() => setShowListMenu(!showListMenu)}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors ${showListMenu ? (isDark ? 'bg-white/10' : 'bg-gray-100') : ''}`}
              >
                <MoreVertical className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
              </button>

              {/* List Menu Dropdown */}
              {showListMenu && (
                <div
                  ref={listMenuRef}
                  className={`absolute right-0 top-10 z-100 w-64 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} rounded-lg shadow-lg border py-2`}
                >
                  {/* Sort Section */}
                  <div className={`px-4 py-2 text-sm ${isDark ? 'text-white' : 'text-gray-500'}`}>Sortieren nach</div>
                  <button
                    onClick={() => { setSortBy('custom'); setShowListMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    {sortBy === 'custom' && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-teal-500'}`} />}
                    {sortBy !== 'custom' && <div className="w-4" />}
                    <span>Meine Reihenfolge</span>
                  </button>
                  <button
                    onClick={() => { setSortBy('date'); setShowListMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    {sortBy === 'date' && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-teal-500'}`} />}
                    {sortBy !== 'date' && <div className="w-4" />}
                    <span>Datum</span>
                  </button>
                  <button
                    onClick={() => { setSortBy('dueDate'); setShowListMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    {sortBy === 'dueDate' && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-teal-500'}`} />}
                    {sortBy !== 'dueDate' && <div className="w-4" />}
                    <span>Frist</span>
                  </button>
                  <button
                    onClick={() => { setSortBy('starred'); setShowListMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    {sortBy === 'starred' && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-teal-500'}`} />}
                    {sortBy !== 'starred' && <div className="w-4" />}
                    <span>Vor Kurzem markiert</span>
                  </button>
                  <button
                    onClick={() => { setSortBy('title'); setShowListMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    {sortBy === 'title' && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-teal-500'}`} />}
                    {sortBy !== 'title' && <div className="w-4" />}
                    <span>Titel</span>
                  </button>

                  <div className={`border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} my-2`} />

                  {/* List Actions */}
                  <button
                    onClick={() => { setShowListMenu(false); /* TODO: Rename list */ }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    <span>Liste umbenennen</span>
                  </button>
                  <div className="px-4 py-2.5">
                    <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-white'}`}>Liste löschen</span>
                    <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-white'} mt-0.5`}>Die Standardliste kann nicht gelöscht werden</p>
                  </div>

                  <div className={`border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} my-2`} />

                  <button
                    onClick={handlePrintList}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    <span>Liste drucken</span>
                  </button>
                  <button
                    onClick={() => { setShowListMenu(false); /* TODO: Delete completed */ }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    <span>Alle erledigten Aufgaben löschen</span>
                  </button>
                  <button
                    onClick={() => { setShowListMenu(false); /* TODO: Manage old tasks */ }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    <span>Alte Aufgaben verwalten</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Add Task Button */}
          <button
            onClick={() => setIsAddingTask(true)}
            className="mt-4 flex items-center gap-3 w-full text-left group"
          >
            {/* Custom Checkmark with Plus Icon */}
            <div className="relative">
              <svg 
                className="h-6 w-6 text-teal-400" 
                viewBox="0 0 24 24" 
                fill="none"
              >
                <path 
                  d="M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18z" 
                  fill="currentColor"
                />
                <path 
                  d="M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.04.46 4.28 1.25l1.45-1.45C16.1 2.67 14.13 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c1.73 0 3.36-.44 4.78-1.22l-1.5-1.5C14.28 19.74 13.17 20 12 20z" 
                  fill="currentColor"
                />
                <path 
                  d="M19 15h-3v2h3v3h2v-3h3v-2h-3v-3h-2v3z" 
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-teal-400 font-medium">Aufgabe hinzufügen</span>
          </button>

        {/* Inline Task Creation Form - Google Tasks Dark Style */}
        <div 
          ref={formRef}
          className={`mt-3 ${isDark ? 'bg-[#303134]' : 'bg-gray-50'} rounded-lg overflow-hidden transition-all duration-300 ease-out ${
            isAddingTask 
              ? `max-h-[200px] opacity-100 border ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}` 
              : 'max-h-0 opacity-0 border-transparent'
          }`}
        >
          <div className="p-4">
            {/* Task Row with Checkbox */}
            <div className="flex items-start gap-3">
              {/* Checkbox Circle */}
              <button
                type="button"
                className="mt-0.5 shrink-0"
                onClick={handleSaveTask}
                title="Erledigt"
              >
                <Circle className={`h-5 w-5 ${isDark ? 'text-gray-500 hover:text-white' : 'text-white hover:text-gray-600'} transition-colors`} />
              </button>

              {/* Title Input */}
              <div className="flex-1">
                <textarea
                  ref={titleInputRef}
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Titel"
                  rows={1}
                  className={`w-full text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'} resize-none border-none outline-none focus:ring-0 p-0 bg-transparent`}
                  style={{ minHeight: '24px' }}
                />
              </div>
            </div>

            {/* Details Row */}
            <div className="flex items-center gap-3 mt-3 ml-8">
              <AlignLeft className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-white'} shrink-0`} />
              <input
                type="text"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Details"
                className={`flex-1 text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-600 placeholder-gray-400'} bg-transparent border-none outline-none focus:ring-0 p-0`}
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between mt-4 ml-8">
              <div className="flex items-center gap-1">
                {/* Quick Date Buttons */}
                <button
                  type="button"
                  onClick={setDueToday}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    isToday
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500'
                      : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Heute
                </button>
                <button
                  type="button"
                  onClick={setDueTomorrow}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    isTomorrow
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500'
                      : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Morgen
                </button>

                {/* Custom Date Picker Button */}
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className={`p-2 rounded-full border transition-colors ${
                    isCustomDate
                      ? 'text-teal-400 border-teal-500'
                      : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-500 border-gray-300 hover:bg-gray-100'
                  }`}
                  title="Datum/Uhrzeit"
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>

              {/* Repeat Button */}
              <button
                type="button"
                onClick={() => setShowRepeatPicker(true)}
                className={`p-2 rounded-full transition-colors ${
                  newTaskForm.repeat 
                    ? 'text-teal-400 hover:bg-teal-500/10' 
                    : isDark ? 'text-white hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Wiederholen"
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Date/Repeat Badges */}
            {(newTaskForm.dueDate || newTaskForm.repeat) && (
              <div className="flex items-center gap-2 mt-3 ml-8">
                {newTaskForm.dueDate && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-teal-500 rounded-full text-sm text-teal-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDueDateDisplay(newTaskForm.dueDate)}</span>
                    <button
                      type="button"
                      onClick={() => setNewTaskForm({ ...newTaskForm, dueDate: '' })}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {newTaskForm.repeat && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-teal-500 rounded-full text-sm text-teal-400">
                    <Repeat className="h-3.5 w-3.5" />
                    <span>
                      {newTaskForm.repeat.interval === 1 
                        ? `Jeden ${newTaskForm.repeat.unit === 'day' ? 'Tag' : newTaskForm.repeat.unit === 'week' ? 'Woche' : newTaskForm.repeat.unit === 'month' ? 'Monat' : 'Jahr'}`
                        : `Alle ${newTaskForm.repeat.interval} ${newTaskForm.repeat.unit === 'day' ? 'Tage' : newTaskForm.repeat.unit === 'week' ? 'Wochen' : newTaskForm.repeat.unit === 'month' ? 'Monate' : 'Jahre'}`
                      }
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewTaskForm({ ...newTaskForm, repeat: undefined })}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      <TaskDatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={newTaskForm.dueDate}
        onDateSelect={(date) => setNewTaskForm({ ...newTaskForm, dueDate: date })}
      />

      {/* Repeat Picker Modal */}
      <TaskRepeatPicker
        isOpen={showRepeatPicker}
        onClose={() => setShowRepeatPicker(false)}
        repeatConfig={newTaskForm.repeat}
        onRepeatSelect={(config) => setNewTaskForm({ ...newTaskForm, repeat: config || undefined })}
        startDate={newTaskForm.dueDate || new Date().toISOString().split('T')[0]}
      />

      {/* Tasks Content */}
      <div className="flex-1 overflow-visible">
        {tasks.length === 0 && completedTasks.length === 0 && !isAddingTask ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            {/* Google Tasks Style Illustration */}
            <div className="mb-6">
              <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                {/* Checkmark circle */}
                <circle cx="35" cy="40" r="12" stroke="#14b8a6" strokeWidth="2" fill="none"/>
                <path d="M30 40 L33 43 L40 36" stroke="#14b8a6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Task lines */}
                <rect x="55" y="32" width="45" height="6" rx="3" fill="#14b8a6"/>
                <rect x="55" y="42" width="30" height="4" rx="2" fill="#2dd4bf"/>
                {/* Second task */}
                <circle cx="35" cy="70" r="8" stroke="#5f6368" strokeWidth="2" fill="none"/>
                <rect x="55" y="66" width="35" height="4" rx="2" fill="#5f6368"/>
                <rect x="55" y="74" width="25" height="3" rx="1.5" fill="#5f6368"/>
              </svg>
            </div>
            <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-800'} mb-2`}>Noch keine Aufgaben</p>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-500'} max-w-xs`}>
              Hier können Sie Ihre To-dos hinzufügen und in allen Google Workspace-Produkten im Auge behalten
            </p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-[#3c4043]' : 'divide-gray-200'}`}>
            {/* Active Tasks */}
            {tasks.map((task) => (
              editingTaskId === task.id ? (
                /* Inline Edit Form */
                <div
                  key={task.id}
                  ref={editFormRef}
                  className={`${isDark ? 'bg-[#303134]' : 'bg-gray-50'} border-l-2 border-teal-500`}
                >
                  <div className="px-6 py-4">
                    {/* Title Row */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskComplete(task.id);
                        }}
                        className="mt-1 shrink-0"
                      >
                        <Circle className={`h-5 w-5 ${isDark ? 'text-gray-500 hover:text-white' : 'text-white hover:text-gray-600'} transition-colors`} />
                      </button>
                      <textarea
                        ref={editTitleInputRef}
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        onKeyDown={handleEditKeyDown}
                        placeholder="Titel"
                        rows={1}
                        className={`flex-1 text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'} bg-transparent border-none outline-none focus:ring-0 resize-none p-0`}
                        style={{ minHeight: '20px' }}
                      />
                    </div>

                    {/* Description Row */}
                    <div className="flex items-center gap-3 mt-3 ml-8">
                      <AlignLeft className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-white'} shrink-0`} />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        onKeyDown={handleEditKeyDown}
                        placeholder="Details"
                        className={`flex-1 text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-600 placeholder-gray-400'} bg-transparent border-none outline-none focus:ring-0 p-0`}
                      />
                    </div>

                    {/* Date Buttons Row */}
                    <div className="flex items-center justify-between mt-4 ml-8">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, dueDate: todayStr })}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            editForm.dueDate === todayStr
                              ? 'bg-teal-500/20 text-teal-400 border-teal-500'
                              : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Heute
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, dueDate: tomorrowStr })}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            editForm.dueDate === tomorrowStr
                              ? 'bg-teal-500/20 text-teal-400 border-teal-500'
                              : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Morgen
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditDatePicker(true)}
                          className={`p-2 rounded-full border transition-colors ${
                            editForm.dueDate && editForm.dueDate !== todayStr && editForm.dueDate !== tomorrowStr
                              ? 'text-teal-400 border-teal-500'
                              : isDark ? 'text-white border-[#5f6368] hover:bg-white/5' : 'text-gray-500 border-gray-300 hover:bg-gray-100'
                          }`}
                          title="Datum/Uhrzeit"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEditRepeatPicker(true)}
                        className={`p-2 rounded-full transition-colors ${
                          editForm.repeat 
                            ? 'text-teal-400 hover:bg-teal-500/10' 
                            : isDark ? 'text-white hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title="Wiederholen"
                      >
                        <Repeat className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Selected Date/Repeat Badges */}
                    {(editForm.dueDate || editForm.repeat) && (
                      <div className="flex items-center gap-2 mt-3 ml-8">
                        {editForm.dueDate && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-teal-500 rounded-full text-sm text-teal-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDueDateDisplay(editForm.dueDate)}</span>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, dueDate: '' })}
                              className="ml-0.5 hover:text-white transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {editForm.repeat && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-teal-500 rounded-full text-sm text-teal-400">
                            <Repeat className="h-3.5 w-3.5" />
                            <span>
                              {editForm.repeat.interval === 1 
                                ? `Jeden ${editForm.repeat.unit === 'day' ? 'Tag' : editForm.repeat.unit === 'week' ? 'Woche' : editForm.repeat.unit === 'month' ? 'Monat' : 'Jahr'}`
                                : `Alle ${editForm.repeat.interval} ${editForm.repeat.unit === 'day' ? 'Tage' : editForm.repeat.unit === 'week' ? 'Wochen' : editForm.repeat.unit === 'month' ? 'Monate' : 'Jahre'}`
                              }
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, repeat: undefined })}
                              className="ml-0.5 hover:text-white transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit Date Picker Modal */}
                  <TaskDatePicker
                    isOpen={showEditDatePicker}
                    onClose={() => setShowEditDatePicker(false)}
                    selectedDate={editForm.dueDate}
                    onDateSelect={(date) => setEditForm({ ...editForm, dueDate: date })}
                  />

                  {/* Edit Repeat Picker Modal */}
                  <TaskRepeatPicker
                    isOpen={showEditRepeatPicker}
                    onClose={() => setShowEditRepeatPicker(false)}
                    repeatConfig={editForm.repeat}
                    onRepeatSelect={(config) => setEditForm({ ...editForm, repeat: config || undefined })}
                    startDate={editForm.dueDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : (
                /* Normal Task View */
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 px-6 py-3 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  onClick={() => startEditTask(task)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskComplete(task.id);
                    }}
                    className="mt-0.5 shrink-0"
                  >
                    <Circle className={`h-5 w-5 ${isDark ? 'text-gray-500 hover:text-white' : 'text-white hover:text-gray-600'} transition-colors`} />
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{task.title}</p>
                    {task.description && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <AlignLeft className={`h-3.5 w-3.5 ${isDark ? 'text-gray-500' : 'text-white'}`} />
                        <p className={`text-xs ${isDark ? 'text-white' : 'text-gray-500'} line-clamp-1`}>{task.description}</p>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 border ${isDark ? 'border-[#5f6368] text-white' : 'border-gray-300 text-gray-600'} rounded-full text-xs`}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDueDateDisplay(task.dueDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Repeat Icon */}
                  {task.repeat && (
                    <div className="mt-0.5 shrink-0">
                      <Repeat className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-white'}`} />
                    </div>
                  )}

                  {/* Star Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskStar(task.id);
                    }}
                    className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-colors ${
                      task.starred ? 'opacity-100' : (hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0')
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 transition-colors ${
                        task.starred
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white hover:text-white'
                      }`}
                    />
                  </button>

                  {/* 3-Dot Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuOpenTaskId === task.id) {
                          setMenuOpenTaskId(null);
                          setMenuPosition(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({ top: rect.bottom + 4, left: rect.right - 224 });
                          setMenuOpenTaskId(task.id);
                        }
                      }}
                      className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-colors ${
                        hoveredTaskId === task.id || menuOpenTaskId === task.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <MoreVertical className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                    </button>
                  </div>
                </div>
              )
            ))}

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div className={`border-t ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
                <button
                  onClick={onToggleShowCompleted}
                  className={`w-full flex items-center gap-2 px-6 py-3 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'} transition-colors`}
                >
                  {showCompleted ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>Erledigt ({completedTasks.length})</span>
                </button>

                {showCompleted && (
                  <div className={`divide-y ${isDark ? 'divide-[#3c4043]' : 'divide-gray-200'}`}>
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group flex items-start gap-3 px-6 py-3 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}
                        onClick={() => onTaskClick(task)}
                      >
                        {/* Spacer for drag handle */}
                        <div className="w-4" />

                        {/* Checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskComplete(task.id);
                          }}
                          className="mt-0.5 shrink-0"
                        >
                          <CheckCircle2 className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-white'}`} />
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-white'} line-through`}>{task.title}</p>
                        </div>

                        {/* Star */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskStar(task.id);
                          }}
                          className="mt-0.5 shrink-0"
                        >
                          <Star
                            className={`h-5 w-5 transition-colors ${
                              task.starred
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600 hover:text-white'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Fixed Task Menu Dropdown - rendered outside card for proper z-index */}
      {menuOpenTaskId && menuPosition && (
        <div
          ref={menuRef}
          className={`fixed w-56 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} rounded-lg shadow-lg border py-2`}
          style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const taskId = menuOpenTaskId;
              setMenuOpenTaskId(null);
              setMenuPosition(null);
              const task = tasks.find(t => t.id === taskId);
              if (task) {
                startEditTask(task);
                setTimeout(() => setShowEditDatePicker(true), 100);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
          >
            <Clock className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            <span>Frist hinzufügen</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenTaskId(null);
              setMenuPosition(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
          >
            <CornerDownRight className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            <span>Unteraufgabe eingeben</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const taskId = menuOpenTaskId;
              setMenuOpenTaskId(null);
              setMenuPosition(null);
              onTaskDelete?.(taskId);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
          >
            <Trash2 className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            <span>Löschen</span>
          </button>
          
          <div className={`border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} my-2`} />
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenTaskId(null);
              setMenuPosition(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
          >
            <Check className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            <span>Meine Aufgaben</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenTaskId(null);
              setMenuPosition(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
          >
            <ListPlus className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            <span>Neue Liste</span>
          </button>
        </div>
      )}
    </div>
  );
}
