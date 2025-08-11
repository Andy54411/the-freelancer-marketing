'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee, Shift } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MonthlyScheduleView } from '@/components/schedule/MonthlyScheduleView';

// Schichttypen Definition für 24-Stunden-Betrieb
const SHIFT_TYPES = [
  {
    id: 'EARLY',
    name: 'Frühschicht',
    defaultStart: '06:00',
    defaultEnd: '14:00',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    badgeColor: 'bg-orange-500 text-white',
  },
  {
    id: 'MIDDLE',
    name: 'Mittelschicht',
    defaultStart: '10:00',
    defaultEnd: '18:00',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: 'bg-blue-500 text-white',
  },
  {
    id: 'LATE',
    name: 'Spätschicht',
    defaultStart: '14:00',
    defaultEnd: '22:00',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeColor: 'bg-purple-500 text-white',
  },
  {
    id: 'NIGHT',
    name: 'Nachtschicht',
    defaultStart: '22:00',
    defaultEnd: '06:00',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeColor: 'bg-indigo-500 text-white',
  },
  {
    id: 'SPLIT',
    name: 'Geteilte Schicht',
    defaultStart: '08:00',
    defaultEnd: '12:00',
    color: 'bg-green-100 text-green-800 border-green-200',
    badgeColor: 'bg-green-500 text-white',
  },
  {
    id: 'CUSTOM',
    name: 'Benutzerdefiniert',
    defaultStart: '09:00',
    defaultEnd: '17:00',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeColor: 'bg-gray-500 text-white',
  },
];

// Schedule Template Interface für zukünftige Features

export default function SchedulePage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Drag & Drop State
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Neue Schicht Modal State
  const [showCreateShiftDialog, setShowCreateShiftDialog] = useState(false);
  const [newShiftForm, setNewShiftForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    shiftType: 'MIDDLE',
    startTime: '10:00',
    endTime: '18:00',
    position: '',
    department: '',
    notes: '',
    status: 'PLANNED' as 'PLANNED' | 'CONFIRMED' | 'ABSENT' | 'SICK',
  });

  useEffect(() => {
    if (user && resolvedParams.uid) {
      loadData();
    }
  }, [user, resolvedParams.uid, currentWeek]);

  // Synchronisiert genehmigte Urlaubsanträge mit dem Dienstplan
  const syncAbsenceRequestsToSchedule = async () => {
    try {
      const absenceRequests = await PersonalService.getAbsenceRequests(resolvedParams.uid);
      const approvedRequests = absenceRequests.filter(req => req.status === 'APPROVED');

      for (const request of approvedRequests) {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        
        // Alle Tage zwischen Start- und Enddatum durchgehen
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          
          // Prüfen ob bereits eine Abwesenheits-Schicht existiert
          const existingShifts = await PersonalService.getShifts(resolvedParams.uid, date, date);
          const existingAbsenceShift = existingShifts.find(shift => 
            shift.employeeId === request.employeeId && 
            shift.date === dateStr &&
            (shift.status === 'ABSENT' || shift.status === 'SICK')
          );

          if (!existingAbsenceShift) {
            // Neue Abwesenheits-Schicht erstellen
            await PersonalService.createShift({
              companyId: resolvedParams.uid,
              employeeId: request.employeeId,
              date: dateStr,
              startTime: '00:00',
              endTime: '23:59',
              position: 'Abwesend',
              department: request.type === 'VACATION' ? 'Urlaub' : 
                         request.type === 'SICK' ? 'Krankheit' : 'Abwesend',
              status: request.type === 'SICK' ? 'SICK' : 'ABSENT',
              notes: `${request.type}: ${request.reason || ''}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Fehler bei Urlaubsanträge-Synchronisation:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeeData.filter(emp => emp.isActive));

      // Lade echte Schichtdaten aus Firestore
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);

      try {
        const shiftData = await PersonalService.getShifts(resolvedParams.uid, weekStart, weekEnd);
        
        // Zusätzlich: Automatisch Abwesenheitsschichten für genehmigte Urlaubsanträge erstellen
        await syncAbsenceRequestsToSchedule();
        
        setShifts(shiftData);
      } catch (error) {
        console.warn('⚠️ Keine Schichtdaten gefunden, verwende Mock-Daten');
        // Fallback Mock-Daten für 24-Stunden-Betrieb
        setShifts([
          {
            id: '1',
            companyId: resolvedParams.uid,
            employeeId: 'emp1',
            date: '2025-08-11',
            startTime: '06:00',
            endTime: '14:00',
            position: 'Frühschicht Koch',
            department: 'Küche',
            status: 'CONFIRMED',
          },
          {
            id: '2',
            companyId: resolvedParams.uid,
            employeeId: 'emp2',
            date: '2025-08-11',
            startTime: '14:00',
            endTime: '22:00',
            position: 'Spätschicht Kellner',
            department: 'Service',
            status: 'PLANNED',
          },
          {
            id: '3',
            companyId: resolvedParams.uid,
            employeeId: 'emp1',
            date: '2025-08-11',
            startTime: '22:00',
            endTime: '06:00',
            position: 'Nachtschicht Security',
            department: 'Sicherheit',
            status: 'CONFIRMED',
          },
          {
            id: '4',
            companyId: resolvedParams.uid,
            employeeId: 'emp2',
            date: '2025-08-12',
            startTime: '10:00',
            endTime: '18:00',
            position: 'Mittelschicht Manager',
            department: 'Management',
            status: 'PLANNED',
          },
        ]);
      }

      // Templates werden später implementiert
    } catch (error) {
      console.error('❌ Fehler beim Laden der Dienstplandaten:', error);
      toast.error('Fehler beim Laden der Dienstplandaten');
    } finally {
      setLoading(false);
    }
  };

  // Event Handlers
  const exportSchedule = async () => {
    try {
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const csv = await PersonalService.exportScheduleCSV(resolvedParams.uid, weekStart, weekEnd);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dienstplan-${currentWeek.toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dienstplan exportiert');
    } catch (error) {
      console.error('❌ Export-Fehler:', error);
      toast.error('Fehler beim Export');
    }
  };

  // Funktion um Zeiten basierend auf Schichttyp zu setzen
  const handleShiftTypeChange = (shiftType: string) => {
    const selectedShift = SHIFT_TYPES.find(shift => shift.id === shiftType);
    if (selectedShift) {
      setNewShiftForm(prev => ({
        ...prev,
        shiftType,
        startTime: selectedShift.defaultStart,
        endTime: selectedShift.defaultEnd,
      }));
    }
  };

  const handleCreateShift = () => {
    if (employees.length === 0) {
      toast.error('Keine Mitarbeiter verfügbar. Bitte fügen Sie zuerst Mitarbeiter hinzu.');
      return;
    }

    // Reset form mit erstem Mitarbeiter vorausgefüllt
    const firstEmployee = employees[0];
    setNewShiftForm({
      employeeId: firstEmployee.id || '',
      date: new Date().toISOString().split('T')[0],
      shiftType: 'MIDDLE',
      startTime: '10:00',
      endTime: '18:00',
      position: firstEmployee.position || '',
      department: firstEmployee.department || '',
      notes: '',
      status: 'PLANNED',
    });

    setShowCreateShiftDialog(true);
  };

  const handleSaveNewShift = async () => {
    try {
      if (!newShiftForm.employeeId) {
        toast.error('Bitte wählen Sie einen Mitarbeiter aus');
        return;
      }

      const newShift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: resolvedParams.uid,
        employeeId: newShiftForm.employeeId,
        date: newShiftForm.date,
        startTime: newShiftForm.startTime,
        endTime: newShiftForm.endTime,
        position: newShiftForm.position,
        department: newShiftForm.department,
        status: newShiftForm.status,
        notes: newShiftForm.notes,
      };

      toast.loading('Erstelle Schicht...');
      const shiftId = await PersonalService.createShift(newShift);

      // Aktualisiere lokale Liste
      const createdShift: Shift = {
        ...newShift,
        id: shiftId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setShifts(prev => [...prev, createdShift]);
      setShowCreateShiftDialog(false);
      toast.success('Schicht erfolgreich erstellt!');
    } catch (error) {
      console.error('❌ Erstellungsfehler:', error);
      toast.error('Fehler beim Erstellen der Schicht');
    }
  };

  const handleCreateShift_OLD = async () => {
    // Old implementation moved for reference
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!shiftId) return;

    try {
      await PersonalService.deleteShift(resolvedParams.uid, shiftId);
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));
      setShowShiftDialog(false);
      toast.success('Schicht gelöscht');
    } catch (error) {
      console.error('❌ Löschfehler:', error);
      toast.error('Fehler beim Löschen der Schicht');
    }
  };

  const handleSaveShift = async () => {
    if (!selectedShift?.id) return;

    try {
      await PersonalService.updateShift(resolvedParams.uid, selectedShift.id, {
        status: selectedShift.status,
        notes: selectedShift.notes,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
      });

      setShifts(prev =>
        prev.map(shift => (shift.id === selectedShift.id ? { ...shift, ...selectedShift } : shift))
      );

      setShowShiftDialog(false);
      toast.success('Schicht gespeichert');
    } catch (error) {
      console.error('❌ Speicherfehler:', error);
      toast.error('Fehler beim Speichern der Schicht');
    }
  };

  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Nur den dragOverDate zurücksetzen wenn wir wirklich das Element verlassen
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, newDate: string) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedShift) return;

    try {
      // Schicht auf neues Datum verschieben
      const updatedShift = { ...draggedShift, date: newDate };

      await PersonalService.updateShift(resolvedParams.uid, draggedShift.id, {
        date: newDate,
      });

      setShifts(prev =>
        prev.map(shift => (shift.id === draggedShift.id ? { ...shift, date: newDate } : shift))
      );

      setDraggedShift(null);
      toast.success(`Schicht zu ${new Date(newDate).toLocaleDateString('de-DE')} verschoben`);
    } catch (error) {
      console.error('❌ Fehler beim Verschieben der Schicht:', error);
      toast.error('Fehler beim Verschieben der Schicht');
      setDraggedShift(null);
    }
  };

  const getWeekDays = (startDate: Date) => {
    const days = [];
    const start = new Date(startDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr);
  };

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'SICK':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Bestätigt';
      case 'PLANNED':
        return 'Geplant';
      case 'ABSENT':
        return 'Abwesend';
      case 'SICK':
        return 'Krank';
      default:
        return status;
    }
  };

  const weekDays = getWeekDays(currentWeek);
  const weeklyHours = shifts.reduce(
    (total, shift) => total + getShiftDuration(shift.startTime, shift.endTime),
    0
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dienstplan</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dienstplan</h1>
          <p className="text-gray-600 mt-1">
            Planen und verwalten Sie Arbeitszeiten für {employees.length} Mitarbeiter
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportSchedule} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => toast('Vorlagen-Feature wird bald verfügbar sein')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Vorlage
          </Button>
          <Button
            onClick={handleCreateShift}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Schicht hinzufügen
          </Button>
        </div>
      </div>

      {/* Week Navigation & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newWeek = new Date(currentWeek);
                newWeek.setDate(newWeek.getDate() - 7);
                setCurrentWeek(newWeek);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-lg">
              {weekDays[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} -{' '}
              {weekDays[6].toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newWeek = new Date(currentWeek);
                newWeek.setDate(newWeek.getDate() + 7);
                setCurrentWeek(newWeek);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Heute
          </Button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#14ad9f]">{shifts.length}</div>
            <div className="text-sm text-gray-600">Schichten</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#14ad9f]">{weeklyHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Wochenstunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#14ad9f]">{employees.length}</div>
            <div className="text-sm text-gray-600">Mitarbeiter</div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={value => setViewMode(value as 'week' | 'month')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="week">Wochenansicht</TabsTrigger>
          <TabsTrigger value="month">Monatsansicht</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4">
          {/* Week Schedule Grid */}
          <div className="grid grid-cols-8 gap-4">
            {/* Time Header */}
            <div className="font-medium text-gray-600 p-4">Zeit</div>
            {weekDays.map((day, index) => (
              <div key={index} className="text-center p-4">
                <div className="font-medium text-gray-900">
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </div>
                <div className="text-sm text-gray-600">
                  {day.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </div>
              </div>
            ))}

            {/* Time Slots - 24 Stunden */}
            {Array.from({ length: 24 }, (_, hour) => hour).map(hour => (
              <React.Fragment key={hour}>
                <div className="text-sm text-gray-600 p-2 border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayShifts = getShiftsForDate(day);
                  const hourShifts = dayShifts.filter(shift => {
                    const startHour = parseInt(shift.startTime.split(':')[0]);
                    const endHour = parseInt(shift.endTime.split(':')[0]);

                    // Handle overnight shifts (e.g., 22:00 - 06:00)
                    if (endHour < startHour) {
                      // Overnight shift: show from start hour until 24h, then from 0h to end hour
                      return startHour <= hour || hour < endHour;
                    } else {
                      // Regular shift: show between start and end hour
                      return startHour <= hour && hour < endHour;
                    }
                  });

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className={`min-h-[60px] border border-gray-200 p-1 transition-colors ${
                        dragOverDate === day.toISOString().split('T')[0]
                          ? 'bg-[#14ad9f] bg-opacity-10 border-[#14ad9f]'
                          : ''
                      }`}
                      onDragOver={e => handleDragOver(e, day.toISOString().split('T')[0])}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, day.toISOString().split('T')[0])}
                    >
                      {hourShifts.map(shift => {
                        const employee = employees.find(emp => emp.id === shift.employeeId);
                        return (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={e => handleDragStart(e, shift)}
                            className={`border-l-4 p-2 rounded text-xs cursor-move hover:bg-opacity-30 transition-colors ${
                              draggedShift?.id === shift.id ? 'opacity-50' : ''
                            } ${
                              // Schichttyp-basierte Farben
                              shift.startTime === '06:00'
                                ? 'bg-orange-100 border-orange-500 text-orange-800'
                                : shift.startTime === '14:00'
                                  ? 'bg-purple-100 border-purple-500 text-purple-800'
                                  : shift.startTime === '22:00'
                                    ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                                    : shift.startTime === '10:00'
                                      ? 'bg-blue-100 border-blue-500 text-blue-800'
                                      : 'bg-[#14ad9f] bg-opacity-20 border-[#14ad9f]'
                            }`}
                            onClick={() => {
                              if (!draggedShift) {
                                // Nur klicken wenn nicht gedraggt wird
                                setSelectedShift(shift);
                                setShowShiftDialog(true);
                              }
                            }}
                          >
                            <div className="font-medium truncate">
                              {employee
                                ? `${employee.firstName} ${employee.lastName}`
                                : 'Unbekannt'}
                            </div>
                            <div className="text-gray-600 truncate">
                              {shift.startTime} - {shift.endTime}
                            </div>
                            <Badge className={getStatusColor(shift.status)}>
                              {getStatusLabel(shift.status)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <MonthlyScheduleView
            employees={employees}
            shifts={shifts}
            currentDate={currentWeek}
            onDateChange={setCurrentWeek}
            onShiftClick={shift => {
              setSelectedShift(shift);
              setShowShiftDialog(true);
            }}
            onCreateShift={handleCreateShift}
          />
        </TabsContent>
      </Tabs>

      {/* Employee Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mitarbeiterübersicht
          </CardTitle>
          <CardDescription>Wochenstunden und Status der Mitarbeiter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(employee => {
              const employeeShifts = shifts.filter(shift => shift.employeeId === employee.id);
              const totalHours = employeeShifts.reduce(
                (sum, shift) => sum + getShiftDuration(shift.startTime, shift.endTime),
                0
              );
              const targetHours = employee.workingHours.weekly;
              const progressPercentage = (totalHours / targetHours) * 100;

              return (
                <div key={employee.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="bg-[#14ad9f] text-white">
                      {employee.firstName[0]}
                      {employee.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-sm text-gray-600">{employee.position}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-sm">
                        {totalHours.toFixed(1)}h / {targetHours}h
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{employeeShifts.length} Schichten</div>
                    {progressPercentage > 100 && <Badge variant="destructive">Überstunden</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift Details Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schicht bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Details dieser Arbeitsschicht</DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mitarbeiter</label>
                  <select
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    value={selectedShift.employeeId}
                    onChange={e =>
                      setSelectedShift({ ...selectedShift, employeeId: e.target.value })
                    }
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    value={selectedShift.status}
                    onChange={e =>
                      setSelectedShift({ ...selectedShift, status: e.target.value as any })
                    }
                  >
                    <option value="PLANNED">Geplant</option>
                    <option value="CONFIRMED">Bestätigt</option>
                    <option value="ABSENT">Abwesend</option>
                    <option value="SICK">Krank</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Startzeit</label>
                  <Input
                    type="time"
                    value={selectedShift.startTime}
                    className="mt-1"
                    onChange={e =>
                      setSelectedShift({ ...selectedShift, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Endzeit</label>
                  <Input
                    type="time"
                    value={selectedShift.endTime}
                    className="mt-1"
                    onChange={e => setSelectedShift({ ...selectedShift, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notizen</label>
                <Input
                  placeholder="Zusätzliche Informationen..."
                  value={selectedShift.notes || ''}
                  className="mt-1"
                  onChange={e => setSelectedShift({ ...selectedShift, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => handleDeleteShift(selectedShift?.id || '')}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleSaveShift}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Shift Dialog */}
      <Dialog open={showCreateShiftDialog} onOpenChange={setShowCreateShiftDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Schicht erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Arbeitsschicht für einen Mitarbeiter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pb-6">
            {/* Mitarbeiter Auswahl */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mitarbeiter *</label>
              <select
                value={newShiftForm.employeeId}
                onChange={e => {
                  const employee = employees.find(emp => emp.id === e.target.value);
                  setNewShiftForm(prev => ({
                    ...prev,
                    employeeId: e.target.value,
                    position: employee?.position || '',
                    department: employee?.department || '',
                  }));
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="">Mitarbeiter auswählen</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </option>
                ))}
              </select>
            </div>

            {/* Schichttyp Auswahl */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Schichttyp *</label>
              <div className="grid grid-cols-2 gap-3">
                {SHIFT_TYPES.map(shiftType => (
                  <button
                    key={shiftType.id}
                    type="button"
                    onClick={() => handleShiftTypeChange(shiftType.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      newShiftForm.shiftType === shiftType.id
                        ? `border-[#14ad9f] ${shiftType.color}`
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{shiftType.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${shiftType.badgeColor}`}>
                        {shiftType.id}
                      </span>
                    </div>
                    <div className="text-sm opacity-75">
                      {shiftType.defaultStart} - {shiftType.defaultEnd}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Datum und Zeiten */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Datum *</label>
                <Input
                  type="date"
                  value={newShiftForm.date}
                  onChange={e => setNewShiftForm(prev => ({ ...prev, date: e.target.value }))}
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Startzeit *</label>
                <Input
                  type="time"
                  value={newShiftForm.startTime}
                  onChange={e => setNewShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Endzeit *</label>
                <Input
                  type="time"
                  value={newShiftForm.endTime}
                  onChange={e => setNewShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
            </div>

            {/* Position und Abteilung */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Input
                  value={newShiftForm.position}
                  onChange={e => setNewShiftForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="z.B. Kellner, Koch..."
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Abteilung</label>
                <Input
                  value={newShiftForm.department}
                  onChange={e => setNewShiftForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="z.B. Küche, Service..."
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={newShiftForm.status}
                onChange={e =>
                  setNewShiftForm(prev => ({ ...prev, status: e.target.value as any }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="PLANNED">Geplant</option>
                <option value="CONFIRMED">Bestätigt</option>
                <option value="ABSENT">Abwesend</option>
                <option value="SICK">Krank</option>
              </select>
            </div>

            {/* Notizen */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notizen</label>
              <textarea
                value={newShiftForm.notes}
                onChange={e => setNewShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Zusätzliche Informationen zur Schicht..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateShiftDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveNewShift}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Schicht erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Shifts State */}
      {shifts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Schichten geplant</h3>
            <p className="text-gray-600 mb-6">
              Erstellen Sie Ihren ersten Dienstplan für diese Woche.
            </p>
            <Button
              onClick={handleCreateShift}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              Erste Schicht erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
