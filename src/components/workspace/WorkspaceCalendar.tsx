'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Workspace } from '@/services/WorkspaceService';

interface WorkspaceCalendarProps {
  workspaces: Workspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onWorkspaceClick?: (workspace: Workspace) => void;
}

type CalendarView = 'month' | 'week' | 'day';

export function WorkspaceCalendar({
  workspaces,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onWorkspaceClick,
}: WorkspaceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-green-500 bg-green-50';
      case 'completed':
        return 'border-blue-500 bg-blue-50';
      case 'paused':
        return 'border-yellow-500 bg-yellow-50';
      case 'archived':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getWorkspacesForDate = (date: Date) => {
    return workspaces.filter(workspace => {
      if (!workspace.dueDate) return false;
      const workspaceDate = new Date(workspace.dueDate);
      return (
        workspaceDate.getDate() === date.getDate() &&
        workspaceDate.getMonth() === date.getMonth() &&
        workspaceDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      days.push(weekDay);
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

  const formatDate = (date: Date, format: 'month' | 'full' | 'day') => {
    switch (format) {
      case 'month':
        return new Intl.DateTimeFormat('de-DE', {
          month: 'long',
          year: 'numeric',
        }).format(date);
      case 'full':
        return new Intl.DateTimeFormat('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(date);
      case 'day':
        return new Intl.DateTimeFormat('de-DE', {
          day: 'numeric',
        }).format(date);
      default:
        return date.toDateString();
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => (
            <div
              key={index}
              className={`min-h-32 p-2 border-r border-b border-gray-200 ${
                day ? 'hover:bg-gray-50' : 'bg-gray-100'
              } ${day && isToday(day) ? 'bg-blue-50' : ''}`}
            >
              {day && (
                <>
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isToday(day) ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {formatDate(day, 'day')}
                  </div>
                  <div className="space-y-1">
                    {getWorkspacesForDate(day)
                      .slice(0, 3)
                      .map(workspace => (
                        <div
                          key={workspace.id}
                          className={`text-xs p-1 rounded border-l-2 ${getStatusColor(workspace.status)} cursor-pointer hover:shadow-sm`}
                          onClick={() => {
                            // Handle workspace click
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getPriorityColor(workspace.priority)}`}
                            />
                            <span className="truncate font-medium">{workspace.title}</span>
                          </div>
                        </div>
                      ))}
                    {getWorkspacesForDate(day).length > 3 && (
                      <div className="text-xs text-gray-500 p-1">
                        +{getWorkspacesForDate(day).length - 3} weitere
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const weekDayNames = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ];

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-7">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-4 border-r border-b border-gray-200 ${
                isToday(day) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-center mb-4">
                <div className="text-sm font-medium text-gray-500">
                  {weekDayNames[day.getDay()]}
                </div>
                <div
                  className={`text-lg font-bold ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {formatDate(day, 'day')}
                </div>
              </div>

              <div className="space-y-2">
                {getWorkspacesForDate(day).map(workspace => (
                  <Card
                    key={workspace.id}
                    className={`cursor-pointer hover:shadow-md ${getStatusColor(workspace.status)}`}
                    onClick={() => onWorkspaceClick?.(workspace)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${getPriorityColor(workspace.priority)}`}
                        />
                        <span className="text-sm font-medium truncate">{workspace.title}</span>
                      </div>
                      {workspace.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {workspace.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {workspace.type}
                        </Badge>
                        {workspace.assignedTo.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {workspace.assignedTo.length}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayWorkspaces = getWorkspacesForDate(currentDate);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{formatDate(currentDate, 'full')}</h2>
        </div>

        <div className="space-y-4">
          {dayWorkspaces.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Workspaces für diesen Tag
              </h3>
              <p className="text-gray-500">
                Füge neue Workspaces hinzu oder wähle ein anderes Datum.
              </p>
            </div>
          ) : (
            dayWorkspaces.map(workspace => (
              <Card
                key={workspace.id}
                className={`cursor-pointer hover:shadow-md ${getStatusColor(workspace.status)}`}
                onClick={() => onWorkspaceClick?.(workspace)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getPriorityColor(workspace.priority)}`}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{workspace.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(workspace.status)}>
                        {workspace.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {workspace.type}
                      </Badge>
                    </div>
                  </div>

                  {workspace.description && (
                    <p className="text-gray-600 mb-4">{workspace.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        Progress: {workspace.progress}%
                      </div>
                      {workspace.assignedTo.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          {workspace.assignedTo.length} zugewiesen
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {workspace.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {workspace.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{workspace.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {view === 'month' && formatDate(currentDate, 'month')}
              {view === 'week' &&
                `Woche vom ${formatDate(getWeekDays(currentDate)[0], 'day')}. - ${formatDate(getWeekDays(currentDate)[6], 'day')}.`}
              {view === 'day' && formatDate(currentDate, 'full')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
                className={view === 'month' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                Monat
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
                className={view === 'week' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                Woche
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
                className={view === 'day' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                Tag
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (view === 'month') navigateMonth('prev');
                  if (view === 'week') navigateWeek('prev');
                  if (view === 'day') navigateDay('prev');
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Heute
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (view === 'month') navigateMonth('next');
                  if (view === 'week') navigateWeek('next');
                  if (view === 'day') navigateDay('next');
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  );
}
