'use client';

import { useState } from 'react';
import { Plus, Star, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface TaskList {
  id: string;
  name: string;
  enabled: boolean;
}

interface TasksSidebarProps {
  isCollapsed: boolean;
  selectedView: 'all' | 'starred';
  onViewChange: (view: 'all' | 'starred') => void;
  taskLists: TaskList[];
  onTaskListToggle: (listId: string) => void;
  onCreateTask: () => void;
  onCreateList: () => void;
}

export function TasksSidebar({
  isCollapsed,
  selectedView,
  onViewChange,
  taskLists,
  onTaskListToggle,
  onCreateTask,
  onCreateList,
}: TasksSidebarProps) {
  const { isDark } = useWebmailTheme();
  const [listsExpanded, setListsExpanded] = useState(true);

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className={`w-64 ${isDark ? 'bg-[#202124] border-[#3c4043]' : 'bg-white border-gray-200'} border-r flex flex-col h-full`}>
      {/* Create Button */}
      <div className="p-4">
        <button
          onClick={onCreateTask}
          className={`flex items-center gap-3 w-full px-4 py-3 ${isDark ? 'bg-[#303134] border-[#5f6368] hover:bg-[#3c4043] text-white' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'} border rounded-2xl transition-colors font-medium`}
        >
          <Plus className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
          <span>Eintragen</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* View Options */}
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onViewChange('all')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-colors ${
                selectedView === 'all'
                  ? 'bg-teal-500/20 text-teal-500'
                  : (isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
              }`}
            >
              <CheckCircle2 className={`h-5 w-5 ${selectedView === 'all' ? 'text-teal-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`} />
              <span className="font-medium">Alle Aufgaben</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => onViewChange('starred')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-colors ${
                selectedView === 'starred'
                  ? 'bg-teal-500/20 text-teal-500'
                  : (isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
              }`}
            >
              <Star className={`h-5 w-5 ${selectedView === 'starred' ? 'text-teal-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`} />
              <span className="font-medium">Markiert</span>
            </button>
          </li>
        </ul>

        {/* Lists Section */}
        <div className="mt-6">
          <button
            onClick={() => setListsExpanded(!listsExpanded)}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <span>Listen</span>
            {listsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {listsExpanded && (
            <ul className="mt-1 space-y-0.5">
              {taskLists.map((list) => (
                <li key={list.id}>
                  <label className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}>
                    <input
                      type="checkbox"
                      checked={list.enabled}
                      onChange={() => onTaskListToggle(list.id)}
                      className={`w-4 h-4 rounded ${isDark ? 'border-gray-600 bg-[#303134]' : 'border-gray-300 bg-white'} text-teal-500 focus:ring-teal-500 focus:ring-offset-0`}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{list.name}</span>
                  </label>
                </li>
              ))}
              
              {/* Create New List */}
              <li>
                <button
                  onClick={onCreateList}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition-colors`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Neue Liste erstellen</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </aside>
  );
}
