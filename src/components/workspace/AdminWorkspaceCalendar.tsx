'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Shield,
  Database,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  de: de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface AdminWorkspaceCalendarProps {
  workspaces: AdminWorkspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<AdminWorkspace>) => void;
  onWorkspaceClick?: (workspace: AdminWorkspace) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AdminWorkspace;
  allDay?: boolean;
}

export function AdminWorkspaceCalendar({
  workspaces,
  onUpdateWorkspace,
  onWorkspaceClick,
}: AdminWorkspaceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [filterSystemLevel, setFilterSystemLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getSystemLevelIcon = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return Shield;
      case 'company':
        return Users;
      case 'user':
        return Activity;
      case 'system':
        return Database;
      default:
        return Activity;
    }
  };

  const getSystemLevelColor = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return '#8b5cf6'; // purple
      case 'company':
        return '#3b82f6'; // blue
      case 'user':
        return '#10b981'; // green
      case 'system':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(workspace => {
      const systemLevelMatch =
        filterSystemLevel === 'all' || workspace.systemLevel === filterSystemLevel;
      const statusMatch = filterStatus === 'all' || workspace.status === filterStatus;
      return systemLevelMatch && statusMatch;
    });
  }, [workspaces, filterSystemLevel, filterStatus]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    filteredWorkspaces.forEach(workspace => {
      // Add workspace due date event
      if (workspace.dueDate) {
        events.push({
          id: `workspace-${workspace.id}`,
          title: workspace.title,
          start: workspace.dueDate,
          end: workspace.dueDate,
          resource: workspace,
          allDay: true,
        });
      }

      // Add task events
      workspace.tasks?.forEach(task => {
        if (task.dueDate && !task.archived) {
          events.push({
            id: `task-${task.id}`,
            title: `${workspace.title}: ${task.title}`,
            start: task.dueDate,
            end: task.dueDate,
            resource: workspace,
            allDay: true,
          });
        }
      });
    });

    return events;
  }, [filteredWorkspaces]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = getSystemLevelColor(event.resource.systemLevel || 'platform');

    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: 'white',
        borderRadius: '4px',
        border: 'none',
        fontSize: '12px',
        padding: '2px 6px',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const IconComponent = getSystemLevelIcon(event.resource.systemLevel || 'platform');

    return (
      <div className="flex items-center gap-1 text-white text-xs">
        <IconComponent className="h-3 w-3" />
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    onWorkspaceClick?.(event.resource);
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const messages = {
    allDay: 'Ganztägig',
    previous: 'Zurück',
    next: 'Weiter',
    today: 'Heute',
    month: 'Monat',
    week: 'Woche',
    day: 'Tag',
    agenda: 'Agenda',
    date: 'Datum',
    time: 'Zeit',
    event: 'Ereignis',
    noEventsInRange: 'Keine Ereignisse in diesem Zeitraum.',
    showMore: (total: number) => `+${total} weitere`,
  };

  const upcomingEvents = calendarEvents
    .filter(event => event.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Admin Workspace Kalender</h2>
          <div className="flex items-center gap-2">
            <Select value={filterSystemLevel} onValueChange={setFilterSystemLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="System Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Level</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
                <SelectItem value="paused">Pausiert</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleNavigate(new Date())}>
              Heute
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate);
                if (currentView === Views.MONTH) {
                  newDate.setMonth(newDate.getMonth() - 1);
                } else if (currentView === Views.WEEK) {
                  newDate.setDate(newDate.getDate() - 7);
                } else {
                  newDate.setDate(newDate.getDate() - 1);
                }
                handleNavigate(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(currentDate);
                if (currentView === Views.MONTH) {
                  newDate.setMonth(newDate.getMonth() + 1);
                } else if (currentView === Views.WEEK) {
                  newDate.setDate(newDate.getDate() + 7);
                } else {
                  newDate.setDate(newDate.getDate() + 1);
                }
                handleNavigate(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-medium text-gray-900 ml-4">
              {currentView === Views.MONTH && format(currentDate, 'MMMM yyyy', { locale: de })}
              {currentView === Views.WEEK &&
                `${format(currentDate, 'dd. MMM', { locale: de })} - ${format(new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'dd. MMM yyyy', { locale: de })}`}
              {currentView === Views.DAY && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={currentView === Views.MONTH ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange(Views.MONTH)}
            >
              Monat
            </Button>
            <Button
              variant={currentView === Views.WEEK ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange(Views.WEEK)}
            >
              Woche
            </Button>
            <Button
              variant={currentView === Views.DAY ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange(Views.DAY)}
            >
              Tag
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Calendar */}
        <div className="flex-1 p-6">
          <div className="h-full bg-white rounded-lg border">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              date={currentDate}
              view={currentView}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{
                event: CustomEvent,
              }}
              messages={messages}
              culture="de"
            />
          </div>
        </div>

        {/* Sidebar with upcoming events */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[#14ad9f]" />
                Anstehende Termine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine anstehenden Termine</p>
              ) : (
                upcomingEvents.map(event => {
                  const IconComponent = getSystemLevelIcon(
                    event.resource.systemLevel || 'platform'
                  );

                  return (
                    <div
                      key={event.id}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg text-white"
                          style={{
                            backgroundColor: getSystemLevelColor(
                              event.resource.systemLevel || 'platform'
                            ),
                          }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {event.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(event.start, 'dd. MMM yyyy', { locale: de })}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className="text-xs"
                              style={{
                                backgroundColor: getSystemLevelColor(
                                  event.resource.systemLevel || 'platform'
                                ),
                              }}
                            >
                              {event.resource.systemLevel || 'platform'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {event.resource.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">System Level Legende</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { level: 'platform', label: 'Platform', icon: Shield },
                { level: 'company', label: 'Company', icon: Users },
                { level: 'user', label: 'User', icon: Activity },
                { level: 'system', label: 'System', icon: Database },
              ].map(({ level, label, icon: Icon }) => (
                <div key={level} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getSystemLevelColor(level) }}
                  />
                  <Icon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
