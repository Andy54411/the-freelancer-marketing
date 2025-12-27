'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface CalendarSidebarProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onCreateEvent: () => void;
  isCollapsed: boolean;
  calendars: CalendarItem[];
  onCalendarToggle: (id: string) => void;
}

interface CalendarItem {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  isOwner?: boolean;
}

export function CalendarSidebar({
  currentDate,
  selectedDate,
  onDateSelect,
  onCreateEvent,
  isCollapsed,
  calendars,
  onCalendarToggle,
}: CalendarSidebarProps) {
  const { isDark } = useWebmailTheme();
  const [miniCalendarDate, setMiniCalendarDate] = useState(currentDate);
  const [myCalendarsExpanded, setMyCalendarsExpanded] = useState(true);
  const [otherCalendarsExpanded, setOtherCalendarsExpanded] = useState(true);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -(startingDay - i - 1));
      days.push(prevDate);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Fill remaining slots
    const remainingSlots = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === miniCalendarDate.getMonth();
  };

  const prevMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(miniCalendarDate);
  const weekDays = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];
  const weekDaysFull = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  const myCalendars = calendars.filter(c => c.isOwner !== false);
  const otherCalendars = calendars.filter(c => c.isOwner === false);

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className={`w-64 ${isDark ? 'bg-[#292a2d] border-[#5f6368]' : 'bg-white border-gray-200'} border-r flex flex-col overflow-y-auto`}>
      {/* Create Button */}
      <div className="p-4">
        <button
          onClick={onCreateEvent}
          className={`flex items-center gap-3 px-6 py-3 ${isDark ? 'bg-[#303134] border-[#5f6368] hover:bg-[#3c4043]' : 'bg-white border-gray-300 hover:bg-gray-50'} border rounded-2xl shadow-md hover:shadow-lg transition-all`}
        >
          <Plus className="h-6 w-6 text-teal-500" />
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>Eintragen</span>
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 pb-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {miniCalendarDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
              aria-label="Vorheriger Monat"
            >
              <ChevronLeft className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={nextMonth}
              className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
              aria-label="Nächster Monat"
            >
              <ChevronRight className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`h-7 flex items-center justify-center text-xs ${isDark ? 'text-white' : 'text-gray-500'}`}
              title={weekDaysFull[index]}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) return <div key={index} className="h-7" />;
            
            const today = isToday(date);
            const selected = isSelected(date);
            const currentMonth = isCurrentMonth(date);

            return (
              <button
                key={index}
                onClick={() => onDateSelect(date)}
                className={`
                  h-7 w-7 flex items-center justify-center text-xs rounded-full
                  transition-colors mx-auto
                  ${today ? 'bg-teal-600 text-white' : ''}
                  ${selected && !today ? (isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700') : ''}
                  ${!today && !selected && currentMonth ? (isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100') : ''}
                  ${!today && !selected && !currentMonth ? (isDark ? 'text-gray-500 hover:bg-white/10' : 'text-white hover:bg-gray-100') : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* My Calendars */}
        <div className={`border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
          <button
            onClick={() => setMyCalendarsExpanded(!myCalendarsExpanded)}
            className={`w-full px-4 py-2 flex items-center justify-between ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
          >
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>Meine Kalender</span>
            {myCalendarsExpanded ? (
              <ChevronUp className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
            )}
          </button>
          
          {myCalendarsExpanded && (
            <div className="pb-2">
              {myCalendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className={`flex items-center gap-3 px-4 py-1.5 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} group`}
                >
                  <input
                    type="checkbox"
                    checked={calendar.enabled}
                    onChange={() => onCalendarToggle(calendar.id)}
                    className={`w-4 h-4 rounded ${isDark ? 'border-gray-500' : 'border-gray-300'} text-teal-600 focus:ring-teal-500`}
                    style={{ accentColor: calendar.color }}
                  />
                  <span className={`flex-1 text-sm ${isDark ? 'text-white' : 'text-gray-700'} truncate`}>{calendar.name}</span>
                  <button className={`opacity-0 group-hover:opacity-100 p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-all`}>
                    <MoreVertical className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other Calendars */}
        {otherCalendars.length > 0 && (
          <div className={`border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <button
                onClick={() => setOtherCalendarsExpanded(!otherCalendarsExpanded)}
                className={`flex-1 px-4 py-2 flex items-center justify-between ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
              >
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>Weitere Kalender</span>
                {otherCalendarsExpanded ? (
                  <ChevronUp className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                ) : (
                  <ChevronDown className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                )}
              </button>
              <button className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors mr-2`}>
                <Plus className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
              </button>
            </div>
            
            {otherCalendarsExpanded && (
              <div className="pb-2">
                {otherCalendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className={`flex items-center gap-3 px-4 py-1.5 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} group`}
                  >
                    <input
                      type="checkbox"
                      checked={calendar.enabled}
                      onChange={() => onCalendarToggle(calendar.id)}
                      className={`w-4 h-4 rounded ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
                      style={{ accentColor: calendar.color }}
                    />
                    <span className={`flex-1 text-sm ${isDark ? 'text-white' : 'text-gray-700'} truncate`}>{calendar.name}</span>
                    <button className={`opacity-0 group-hover:opacity-100 p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-all`}>
                      <MoreVertical className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className={`p-4 text-xs ${isDark ? 'text-white border-[#5f6368]' : 'text-gray-500 border-gray-200'} border-t`}>
        <a href="#" className="hover:underline">Nutzungsbedingungen</a>
        {' - '}
        <a href="#" className="hover:underline">Datenschutz</a>
      </div>
    </aside>
  );
}
