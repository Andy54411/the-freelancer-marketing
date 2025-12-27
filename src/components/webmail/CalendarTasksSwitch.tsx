'use client';

import { Calendar as CalendarIcon, CheckSquare } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { getAppUrl } from '@/lib/webmail-urls';

interface CalendarTasksSwitchProps {
  activeView: 'calendar' | 'tasks';
}

export function CalendarTasksSwitch({ activeView }: CalendarTasksSwitchProps) {
  const { isDark } = useWebmailTheme();

  return (
    <div className={`hidden md:flex items-center border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg overflow-hidden`}>
      <button
        onClick={activeView !== 'calendar' ? () => window.location.href = getAppUrl('/webmail/calendar') : undefined}
        className={`p-2 transition-colors ${
          activeView === 'calendar'
            ? (isDark ? 'bg-[#3c4043]' : 'bg-teal-500')
            : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')
        }`}
        aria-current={activeView === 'calendar' ? 'page' : undefined}
        title="Kalender"
      >
        <CalendarIcon className={`h-5 w-5 ${activeView === 'calendar' ? 'text-white' : (isDark ? 'text-white' : 'text-gray-600')}`} />
      </button>
      <button
        onClick={activeView !== 'tasks' ? () => window.location.href = getAppUrl('/webmail/tasks') : undefined}
        className={`p-2 transition-colors border-l ${isDark ? 'border-gray-600' : 'border-gray-300'} ${
          activeView === 'tasks'
            ? (isDark ? 'bg-[#3c4043]' : 'bg-teal-500')
            : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')
        }`}
        aria-current={activeView === 'tasks' ? 'page' : undefined}
        title="Aufgaben"
      >
        <CheckSquare className={`h-5 w-5 ${activeView === 'tasks' ? 'text-white' : (isDark ? 'text-white' : 'text-gray-600')}`} />
      </button>
    </div>
  );
}
