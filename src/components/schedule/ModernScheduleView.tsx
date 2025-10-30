'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, momentLocalizer, Views, View, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import moment from 'moment';
import 'moment/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  BarChart3,
} from 'lucide-react';
import { Shift, Employee } from '@/services/personalService';
import { cn } from '@/lib/utils';

// Deutsche Lokalisierung
moment.locale('de');
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop<CalendarEvent, any>(Calendar);

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Shift;
  allDay?: boolean;
}

interface ModernScheduleViewProps {
  shifts: Shift[];
  employees: Employee[];
  onShiftClick?: (shift: Shift) => void;
  onShiftUpdate?: (shiftId: string, updates: Partial<Shift>) => void;
  onSlotSelect?: (slotInfo: any) => void;
  className?: string;
}

export default function ModernScheduleView({
  shifts = [],
  employees = [],
  onShiftClick,
  onShiftUpdate,
  onSlotSelect,
  className,
}: ModernScheduleViewProps) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Events für Kalender
  const events: CalendarEvent[] = useMemo(() => {
    return shifts
      .filter((shift) => {
        if (filterEmployee !== 'all' && shift.employeeId !== filterEmployee) return false;
        if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
        return true;
      })
      .map((shift) => {
        const employee = employees.find((e) => e.id === shift.employeeId);
        const startDateTime = new Date(`${shift.date}T${shift.startTime}:00`);
        const endDateTime = new Date(`${shift.date}T${shift.endTime}:00`);

        if (shift.endTime < shift.startTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        return {
          id: shift.id || '',
          title: `${employee?.firstName || 'Unbekannt'} - ${shift.position}`,
          start: startDateTime,
          end: endDateTime,
          resource: shift,
        };
      });
  }, [shifts, employees, filterEmployee, filterStatus]);

  // Drag & Drop Handler
  const handleEventDrop = ({ event, start, end }: any) => {
    const shift = event.resource;
    const newDate = moment(start).format('YYYY-MM-DD');
    const newStartTime = moment(start).format('HH:mm');
    const newEndTime = moment(end).format('HH:mm');

    if (onShiftUpdate && shift.id) {
      onShiftUpdate(shift.id, {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
  };

  const handleEventResize = ({ event, start, end }: any) => {
    const shift = event.resource;
    const newStartTime = moment(start).format('HH:mm');
    const newEndTime = moment(end).format('HH:mm');

    if (onShiftUpdate && shift.id) {
      onShiftUpdate(shift.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
  };

  // Event Component mit unterschiedlichen Farben
  const colors = [
    { bg: 'bg-[#14ad9f]', border: 'border-[#0d8b7f]', text: 'text-white' },
    { bg: 'bg-blue-500', border: 'border-blue-700', text: 'text-white' },
    { bg: 'bg-purple-500', border: 'border-purple-700', text: 'text-white' },
    { bg: 'bg-orange-500', border: 'border-orange-700', text: 'text-white' },
    { bg: 'bg-pink-500', border: 'border-pink-700', text: 'text-white' },
    { bg: 'bg-indigo-500', border: 'border-indigo-700', text: 'text-white' },
  ];

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const shift = event.resource;
    const employee = employees.find((e) => e.id === shift.employeeId);
    const employeeIndex = employees.findIndex((e) => e.id === shift.employeeId);
    const colorScheme = colors[employeeIndex % colors.length];
    
    return (
      <div className={`h-full w-full px-2 py-1 ${colorScheme.bg} ${colorScheme.text} rounded-md shadow-md border-l-4 ${colorScheme.border} hover:opacity-90 transition-opacity cursor-pointer`}>
        <div className="font-bold text-sm truncate">
          {employee?.firstName} {employee?.lastName}
        </div>
        <div className="text-xs truncate font-medium opacity-95">
          {shift.position}
        </div>
        <div className="text-xs font-semibold mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {shift.startTime} - {shift.endTime}
        </div>
      </div>
    );
  };

  // Custom Toolbar
  const CustomToolbar = ({ onNavigate, label }: any) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Heute
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold">{label}</h2>

      <div className="flex items-center gap-2">
        <Button
          variant={view === Views.MONTH ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView(Views.MONTH)}
        >
          <Grid3X3 className="h-4 w-4 mr-1" />
          Monat
        </Button>
        <Button
          variant={view === Views.WEEK ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView(Views.WEEK)}
        >
          <List className="h-4 w-4 mr-1" />
          Woche
        </Button>
        <Button
          variant={view === Views.DAY ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView(Views.DAY)}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Tag
        </Button>
      </div>
    </div>
  );

  if (!employees.length && !shifts.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('space-y-6', className)}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keine Dienstplandaten vorhanden
            </h3>
            <p className="text-gray-500 mb-4">
              Es sind noch keine Mitarbeiter oder Schichten angelegt.
            </p>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              <Users className="h-4 w-4 mr-2" />
              Mitarbeiter hinzufügen
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Mitarbeiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
            {employees.map((emp) => 
              emp.id ? (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ) : null
            )}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="PLANNED">Geplant</SelectItem>
            <SelectItem value="CONFIRMED">Bestätigt</SelectItem>
            <SelectItem value="ABSENT">Abwesend</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Badge variant="outline">
            {employees.length} Mitarbeiter • {shifts.length} Schichten
          </Badge>
        </div>
      </div>

      {/* Kalender */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#14ad9f]" />
            Dienstplan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div style={{ height: '700px' }}>
            <DragAndDropCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={(event: any) => {
                setSelectedShift(event.resource);
                onShiftClick?.(event.resource);
              }}
              onSelectSlot={onSlotSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              resizable
              selectable
              popup
              step={30}
              timeslots={2}
              min={new Date(2025, 0, 1, 6, 0)}
              max={new Date(2025, 0, 1, 23, 0)}
              components={{
                toolbar: CustomToolbar,
                event: EventComponent as any,
              }}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format('HH:mm')}-${moment(end).format('HH:mm')}`,
                dayHeaderFormat: 'DD ddd',
                monthHeaderFormat: 'MMMM YYYY',
                weekdayFormat: 'dddd',
              }}
              messages={{
                today: 'Heute',
                previous: 'Zurück',
                next: 'Weiter',
                month: 'Monat',
                week: 'Woche',
                day: 'Tag',
                agenda: 'Agenda',
                date: 'Datum',
                time: 'Zeit',
                event: 'Schicht',
                noEventsInRange: 'Keine Schichten',
                showMore: (total) => `+ ${total} weitere`,
                allDay: 'Ganztägig',
              }}
              className="clean-calendar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schichtdetails</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div>
                <strong>Mitarbeiter:</strong>{' '}
                {employees.find((e) => e.id === selectedShift.employeeId)?.firstName}
              </div>
              <div>
                <strong>Position:</strong> {selectedShift.position}
              </div>
              <div>
                <strong>Zeit:</strong> {selectedShift.startTime} - {selectedShift.endTime}
              </div>
              <div>
                <strong>Datum:</strong> {selectedShift.date}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSS */}
      <style jsx global>{`
        .clean-calendar {
          background: white;
          border-radius: 8px;
          font-family: inherit;
        }

        .clean-calendar .rbc-header {
          padding: 16px 8px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          border-bottom: 1px solid #e5e7eb !important;
          background: #f9fafb !important;
          color: #111827 !important;
          text-align: center !important;
        }

        .clean-calendar .rbc-today {
          background-color: #ecfdf5 !important;
        }

        .clean-calendar .rbc-today .rbc-header {
          background-color: #d1fae5 !important;
          color: #14ad9f !important;
        }

        .clean-calendar .rbc-event {
          background: none !important;
          border: none !important;
          padding: 2px !important;
        }

        .clean-calendar .rbc-event-content {
          height: 100% !important;
          width: 100% !important;
          overflow: visible !important;
        }

        .clean-calendar .rbc-time-slot {
          border-bottom: 1px solid #f3f4f6 !important;
          min-height: 40px !important;
        }

        .clean-calendar .rbc-timeslot-group {
          border-bottom: 1px solid #e5e7eb !important;
          min-height: 80px !important;
        }

        .clean-calendar .rbc-day-slot .rbc-event {
          border: none !important;
        }

        .clean-calendar .rbc-day-slot .rbc-event-label {
          display: none !important;
        }

        .clean-calendar .rbc-events-container {
          margin-right: 0 !important;
        }

        .clean-calendar .rbc-event.rbc-addons-dnd-resizable {
          z-index: 10 !important;
        }

        .clean-calendar .rbc-event:hover {
          z-index: 20 !important;
        }

        .clean-calendar .rbc-show-more {
          background: #14ad9f;
          color: white;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
        }

        .clean-calendar .rbc-selected {
          background-color: #0d8b7f !important;
        }
      `}</style>
    </motion.div>
  );
}
