'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import moment from 'moment';
import 'moment/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  BarChart3,
  UserCheck,
  UserX,
  Coffee,
  Moon,
  Sun,
  Sunset,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Shift, Employee } from '@/services/personalService';
import { cn } from '@/lib/utils';

// Deutsche Lokalisierung für moment
moment.locale('de');
const localizer = momentLocalizer(moment);

// Create DnD Calendar
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Schicht-Status Typen (basierend auf echten Daten)
const SHIFT_TYPES = {
  PLANNED: {
    name: 'Geplant',
    icon: Clock,
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    textColor: '#059669',
  },
  CONFIRMED: {
    name: 'Bestätigt',
    icon: CheckCircle,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    textColor: '#047857',
  },
  ABSENT: {
    name: 'Abwesend',
    icon: UserX,
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#dc2626',
  },
  SICK: {
    name: 'Krank',
    icon: AlertCircle,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fed7aa',
    textColor: '#d97706',
  },
  // Zusätzliche Schichttypen basierend auf Zeit (für erweiterte Analyse)
  EARLY: {
    name: 'Frühschicht',
    icon: Sun,
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    textColor: '#ea580c',
  },
  MIDDLE: {
    name: 'Mittelschicht',
    icon: Coffee,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#2563eb',
  },
  LATE: {
    name: 'Spätschicht',
    icon: Sunset,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    textColor: '#7c3aed',
  },
  NIGHT: {
    name: 'Nachtschicht',
    icon: Moon,
    color: '#6366f1',
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#4f46e5',
  },
};

interface ModernScheduleViewProps {
  shifts: Shift[];
  employees: Employee[];
  onShiftClick?: (shift: Shift) => void;
  onSlotSelect?: (slotInfo: any) => void;
  onShiftUpdate?: (shiftId: string, updates: Partial<Shift>) => void;
  className?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Shift;
  allDay?: boolean;
}

export function ModernScheduleView({
  shifts,
  employees,
  onShiftClick,
  onSlotSelect,
  onShiftUpdate,
  className,
}: ModernScheduleViewProps) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [showShiftTypeDetail, setShowShiftTypeDetail] = useState(false);

  // Funktion zur Bestimmung des Schichttyps basierend auf der Uhrzeit
  const getShiftTypeByTime = (startTime: string, status: string): string => {
    // Abwesenheitsschichten werden nach Status kategorisiert, nicht nach Zeit
    if (['ABSENT', 'SICK'].includes(status)) {
      return status;
    }

    const hour = parseInt(startTime.split(':')[0]);

    if (hour >= 6 && hour < 10) return 'EARLY'; // 06:00-09:59 = Frühschicht
    if (hour >= 10 && hour < 14) return 'MIDDLE'; // 10:00-13:59 = Mittelschicht
    if (hour >= 14 && hour < 22) return 'LATE'; // 14:00-21:59 = Spätschicht
    if (hour >= 22 || hour < 6) return 'NIGHT'; // 22:00-05:59 = Nachtschicht

    return 'MIDDLE'; // Default fallback
  };

  // Kombinierte Statistik-Berechnung
  const getStatistics = () => {
    const statusStats = {
      PLANNED: shifts.filter(shift => shift.status === 'PLANNED').length,
      CONFIRMED: shifts.filter(shift => shift.status === 'CONFIRMED').length,
      ABSENT: shifts.filter(shift => shift.status === 'ABSENT').length,
      SICK: shifts.filter(shift => shift.status === 'SICK').length,
    };

    const timeStats = {
      EARLY: shifts.filter(shift => getShiftTypeByTime(shift.startTime, shift.status) === 'EARLY')
        .length,
      MIDDLE: shifts.filter(shift => getShiftTypeByTime(shift.startTime, shift.status) === 'MIDDLE')
        .length,
      LATE: shifts.filter(shift => getShiftTypeByTime(shift.startTime, shift.status) === 'LATE')
        .length,
      NIGHT: shifts.filter(shift => getShiftTypeByTime(shift.startTime, shift.status) === 'NIGHT')
        .length,
    };

    return { ...statusStats, ...timeStats };
  };

  const statistics = getStatistics();

  // Funktion um Schichten nach Typ zu filtern
  const getShiftsByType = (type: string) => {
    if (['PLANNED', 'CONFIRMED', 'ABSENT', 'SICK'].includes(type)) {
      // Status-basierte Filterung
      return shifts.filter(shift => shift.status === type);
    } else if (['EARLY', 'MIDDLE', 'LATE', 'NIGHT'].includes(type)) {
      // Zeit-basierte Filterung (nur für normale Schichten, nicht Abwesenheiten)
      return shifts.filter(
        shift =>
          getShiftTypeByTime(shift.startTime, shift.status) === type &&
          !['ABSENT', 'SICK'].includes(shift.status)
      );
    }
    return [];
  };

  // Handler für Klick auf Statistik-Karte
  const handleStatCardClick = (type: string) => {
    const shiftsOfType = getShiftsByType(type);
    if (shiftsOfType.length > 0) {
      setSelectedShiftType(type);
      setShowShiftTypeDetail(true);
    }
  };

  // Konvertiere Shifts zu Calendar Events
  const events: CalendarEvent[] = useMemo(() => {
    return shifts
      .filter(shift => {
        if (filterEmployee !== 'all' && shift.employeeId !== filterEmployee) return false;
        if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
        return true;
      })
      .map(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId);

        // Kombiniere Datum mit Start-/Endzeit
        const startDateTime = new Date(`${shift.date}T${shift.startTime}:00`);
        const endDateTime = new Date(`${shift.date}T${shift.endTime}:00`);

        // Handle Nachtschichten (über Mitternacht)
        if (shift.endTime < shift.startTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        // Abwesenheitsschichten (Urlaub, Krankheit) als ganztägige Events behandeln
        const isAbsence = ['ABSENT', 'SICK'].includes(shift.status);
        const isFullDay = shift.startTime === '00:00' && shift.endTime === '23:59';

        return {
          id: shift.id || '',
          title: isAbsence
            ? `${employee?.firstName || 'Unbekannt'} - ${shift.position}`
            : `${employee?.firstName || 'Unbekannt'} - ${shift.position}`,
          start: isAbsence || isFullDay ? new Date(shift.date) : startDateTime,
          end: isAbsence || isFullDay ? new Date(shift.date) : endDateTime,
          resource: shift,
          allDay: isAbsence || isFullDay,
        };
      });
  }, [shifts, employees, filterEmployee, filterStatus]);

  // Early return für leere Daten mit verbesserter UX
  if (!employees.length && !shifts.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('space-y-6', className)}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <CalendarIcon className="h-16 w-16 text-gray-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Keine Dienstplandaten vorhanden
                </h3>
                <p className="text-gray-500 mb-4">
                  Es sind noch keine Mitarbeiter oder Schichten angelegt.
                </p>
                <Button
                  onClick={() => (window.location.href = 'employees')}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Mitarbeiter hinzufügen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Custom Event Component mit korrekten Typen
  const EventComponent = ({ event }: any) => {
    const shift = event.resource;
    const employee = employees.find(emp => emp.id === shift.employeeId);
    const shiftType = SHIFT_TYPES[shift.status as keyof typeof SHIFT_TYPES] || SHIFT_TYPES.PLANNED;
    const Icon = shiftType.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className={cn(
          'flex items-center gap-1 p-1 rounded text-xs font-medium w-full h-full',
          'border cursor-pointer transition-all duration-200',
          'hover:shadow-md overflow-hidden'
        )}
        style={{
          backgroundColor: shiftType.bgColor,
          borderColor: shiftType.borderColor,
          color: shiftType.textColor,
          minHeight: '20px',
        }}
        onClick={() => {
          setSelectedShift(shift);
          onShiftClick?.(shift);
        }}
      >
        <Icon className="h-3 w-3 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="truncate font-medium text-xs">
            {employee?.firstName} {employee?.lastName}
          </div>
          <div className="truncate text-[10px] opacity-75">
            {['ABSENT', 'SICK'].includes(shift.status) ? shift.position : `${shift.position}`}
          </div>
          {!['ABSENT', 'SICK'].includes(shift.status) && (
            <div className="truncate text-[10px] opacity-60">
              {shift.startTime}-{shift.endTime}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Drag & Drop Handlers
  const handleEventDrop = ({
    event,
    start,
    end,
  }: {
    event: CalendarEvent;
    start: Date;
    end: Date;
  }) => {
    const shift = event.resource;

    // Neue Zeiten berechnen
    const newDate = moment(start).format('YYYY-MM-DD');
    const newStartTime = moment(start).format('HH:mm');
    const newEndTime = moment(end).format('HH:mm');

    // Update-Objekt erstellen
    const updates: Partial<Shift> = {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    // Callback aufrufen wenn verfügbar
    if (onShiftUpdate && shift.id) {
      onShiftUpdate(shift.id, updates);
    }
  };

  const handleEventResize = ({
    event,
    start,
    end,
  }: {
    event: CalendarEvent;
    start: Date;
    end: Date;
  }) => {
    const shift = event.resource;

    // Neue Zeiten berechnen
    const newStartTime = moment(start).format('HH:mm');
    const newEndTime = moment(end).format('HH:mm');

    // Update-Objekt erstellen
    const updates: Partial<Shift> = {
      startTime: newStartTime,
      endTime: newEndTime,
    };

    // Callback aufrufen wenn verfügbar
    if (onShiftUpdate && shift.id) {
      onShiftUpdate(shift.id, updates);
    }
  };

  // Custom Toolbar
  const CustomToolbar = ({ onNavigate, label, onView, view: currentView }: any) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
            className="hover:bg-[#14ad9f]/10 hover:border-[#14ad9f]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
            className="hover:bg-[#14ad9f]/10 hover:border-[#14ad9f]"
          >
            Heute
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
            className="hover:bg-[#14ad9f]/10 hover:border-[#14ad9f]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Mitarbeiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id || ''}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {Object.entries(SHIFT_TYPES).map(([key, type]) => (
                <SelectItem key={key} value={key}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher */}
        <Tabs value={currentView} onValueChange={onView} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value={Views.MONTH} className="px-3 py-1 text-xs">
              <Grid3X3 className="h-3 w-3 mr-1" />
              Monat
            </TabsTrigger>
            <TabsTrigger value={Views.WEEK} className="px-3 py-1 text-xs">
              <List className="h-3 w-3 mr-1" />
              Woche
            </TabsTrigger>
            <TabsTrigger value={Views.DAY} className="px-3 py-1 text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Tag
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  // Custom Day Header
  const CustomDayHeader = ({ date, label }: { date: Date; label: string }) => {
    const today = moment().isSame(date, 'day');
    const dayShifts = events.filter(event => moment(event.start).isSame(date, 'day'));

    return (
      <div
        className={cn(
          'flex flex-col items-center p-2 border-b',
          today && 'bg-[#14ad9f]/10 border-[#14ad9f]'
        )}
      >
        <div className={cn('text-sm font-medium', today ? 'text-[#14ad9f]' : 'text-gray-700')}>
          {label}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {dayShifts.length} Schichten
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Statistics Cards - Improved Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(SHIFT_TYPES).map(([key, type]) => {
          const count = statistics[key as keyof typeof statistics] || 0;
          const Icon = type.icon;
          const percentage = shifts.length > 0 ? Math.round((count / shifts.length) * 100) : 0;

          return (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden"
              onClick={() => handleStatCardClick(key)}
            >
              <Card className="border-l-4 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-2 transition-all duration-300"
                  style={{ backgroundColor: type.color }}
                />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{type.name}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold" style={{ color: type.color }}>
                          {count}
                        </p>
                        {shifts.length > 0 && (
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        )}
                      </div>
                      {count > 0 && (
                        <p className="text-xs text-gray-400 mt-1">Klicken für Details</p>
                      )}
                    </div>
                    <div
                      className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: type.bgColor }}
                    >
                      <Icon className="h-5 w-5" style={{ color: type.color }} />
                    </div>
                  </div>
                  {/* Mini Progress Bar */}
                  {shifts.length > 0 && (
                    <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-700 ease-out"
                        style={{
                          backgroundColor: type.color,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Enhanced Calendar */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-4 bg-gradient-to-r from-[#14ad9f]/5 to-[#14ad9f]/10">
          <CardTitle className="flex items-center gap-3 text-gray-900">
            <div className="p-2 bg-[#14ad9f]/10 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-[#14ad9f]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Dienstplan</h2>
              <p className="text-sm text-gray-500 font-normal">
                {employees.length} Mitarbeiter • {shifts.length} Schichten
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="calendar-container" style={{ height: '700px' }}>
            <DragAndDropCalendar
              localizer={localizer}
              events={events}
              startAccessor={(event: any) => event.start}
              endAccessor={(event: any) => event.end}
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
              showMultiDayTimes
              step={30}
              timeslots={2}
              min={new Date(2025, 0, 1, 6, 0)} // 6:00 AM
              max={new Date(2025, 0, 1, 23, 0)} // 11:00 PM
              components={{
                toolbar: CustomToolbar,
                event: EventComponent as any,
                week: {
                  event: EventComponent as any,
                },
                day: {
                  event: EventComponent as any,
                },
                month: {
                  header: CustomDayHeader,
                  event: EventComponent as any,
                },
                agenda: {
                  event: EventComponent as any,
                },
              }}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) =>
                  `${moment(start).format('HH:mm')}-${moment(end).format('HH:mm')}`,
                dayHeaderFormat: 'dddd DD.MM',
                monthHeaderFormat: 'MMMM YYYY',
                weekdayFormat: 'dddd',
                dayRangeHeaderFormat: ({ start, end }) =>
                  `${moment(start).format('DD. MMM')} - ${moment(end).format('DD. MMM YYYY')}`,
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
                noEventsInRange: 'Keine Schichten in diesem Zeitraum',
                showMore: total => `+ ${total} weitere`,
                allDay: 'Ganztägig',
                work_week: 'Arbeitswoche',
              }}
              className="modern-calendar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-md">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#14ad9f]" />
                  Schicht Details
                </DialogTitle>
                <DialogDescription>Informationen zur ausgewählten Schicht</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {(() => {
                  const employee = employees.find(emp => emp.id === selectedShift.employeeId);
                  const shiftType =
                    SHIFT_TYPES[selectedShift.status as keyof typeof SHIFT_TYPES] ||
                    SHIFT_TYPES.PLANNED;
                  const Icon = shiftType.icon;

                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                            {employee?.firstName?.[0]}
                            {employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {employee?.firstName} {employee?.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{selectedShift.position}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Datum</label>
                          <p className="font-medium">
                            {moment(selectedShift.date).format('DD.MM.YYYY')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Zeit</label>
                          <p className="font-medium">
                            {selectedShift.startTime} - {selectedShift.endTime}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Icon className="h-4 w-4" style={{ color: shiftType.color }} />
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: shiftType.color,
                              color: shiftType.color,
                              backgroundColor: shiftType.bgColor,
                            }}
                          >
                            {shiftType.name}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Abteilung</label>
                        <p className="font-medium">{selectedShift.department}</p>
                      </div>

                      {selectedShift.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Notizen</label>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {selectedShift.notes}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Type Detail Modal */}
      <Dialog open={showShiftTypeDetail} onOpenChange={setShowShiftTypeDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedShiftType && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => {
                    const typeInfo = SHIFT_TYPES[selectedShiftType as keyof typeof SHIFT_TYPES];
                    const Icon = typeInfo.icon;
                    return (
                      <>
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: typeInfo.bgColor }}
                        >
                          <Icon className="h-6 w-6" style={{ color: typeInfo.color }} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{typeInfo.name}</h2>
                          <p className="text-sm text-gray-500 font-normal">
                            {getShiftsByType(selectedShiftType).length} Schichten
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </DialogTitle>
                <DialogDescription>Übersicht aller Schichten in dieser Kategorie</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {getShiftsByType(selectedShiftType).map((shift, index) => {
                  const employee = employees.find(emp => emp.id === shift.employeeId);
                  const shiftTypeInfo = SHIFT_TYPES[selectedShiftType as keyof typeof SHIFT_TYPES];

                  return (
                    <motion.div
                      key={shift.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedShift(shift);
                        setShowShiftTypeDetail(false);
                        onShiftClick?.(shift);
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                          {employee?.firstName?.[0]}
                          {employee?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {employee?.firstName} {employee?.lastName}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: shiftTypeInfo.color,
                              color: shiftTypeInfo.color,
                              backgroundColor: shiftTypeInfo.bgColor,
                            }}
                          >
                            {shift.status === 'ABSENT' && shift.position.includes('Urlaub')
                              ? 'Urlaub'
                              : shift.status === 'SICK'
                                ? 'Krankheit'
                                : shift.position}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Datum:</span>
                            <br />
                            {moment(shift.date).format('DD.MM.YYYY')}
                          </div>
                          <div>
                            <span className="font-medium">Zeit:</span>
                            <br />
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div>
                            <span className="font-medium">Abteilung:</span>
                            <br />
                            {shift.department}
                          </div>
                        </div>

                        {shift.notes && (
                          <p className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded">
                            {shift.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className="w-3 h-3 rounded-full mb-1"
                          style={{ backgroundColor: shiftTypeInfo.color }}
                        />
                        <p className="text-xs text-gray-500">
                          {['EARLY', 'MIDDLE', 'LATE', 'NIGHT'].includes(selectedShiftType)
                            ? 'Schichtzeit'
                            : ['ABSENT', 'SICK'].includes(selectedShiftType)
                              ? 'Abwesenheit'
                              : 'Status'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {getShiftsByType(selectedShiftType).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Keine Schichten in dieser Kategorie gefunden</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom CSS */}
      <style jsx global>{`
        .modern-calendar {
          background: white;
          border-radius: 8px;
        }

        .modern-calendar .rbc-header {
          padding: 8px;
          font-weight: 500;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modern-calendar .rbc-time-view .rbc-time-gutter {
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
        }

        .modern-calendar .rbc-time-slot {
          border-bottom: 1px solid #f3f4f6;
        }

        .modern-calendar .rbc-timeslot-group {
          border-bottom: 1px solid #e5e7eb;
        }

        .modern-calendar .rbc-today {
          background-color: #14ad9f08;
        }

        .modern-calendar .rbc-event {
          background: none !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        .modern-calendar .rbc-event-content {
          padding: 0;
        }

        .modern-calendar .rbc-show-more {
          background: #14ad9f;
          color: white;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
        }

        .modern-calendar .rbc-month-view .rbc-date-cell {
          padding: 8px;
          min-height: 100px;
        }

        .modern-calendar .rbc-off-range-bg {
          background: #f9fafb;
        }

        .modern-calendar .rbc-allday-cell {
          padding: 2px 4px;
        }

        .modern-calendar .rbc-row-content {
          z-index: auto;
        }

        .modern-calendar .rbc-month-view .rbc-event {
          margin: 1px;
        }

        .modern-calendar .rbc-allday-event {
          margin: 2px 1px;
        }
      `}</style>
    </motion.div>
  );
}
