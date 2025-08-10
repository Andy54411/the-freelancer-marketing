'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
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

interface Shift {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  department: string;
  notes?: string;
  status: 'PLANNED' | 'CONFIRMED' | 'ABSENT' | 'SICK';
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  shifts: Omit<Shift, 'id' | 'date' | 'createdAt' | 'updatedAt'>[];
  isActive: boolean;
}

export default function SchedulePage({ params }: { params: { uid: string } }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (user && params.uid) {
      loadData();
    }
  }, [user, params.uid]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployees(params.uid);
      setEmployees(employeeData.filter(emp => emp.isActive));

      // TODO: Implement shift loading from Firestore
      // const shiftData = await ScheduleService.getShifts(params.uid, currentWeek);
      // setShifts(shiftData);

      // Mock data for demo
      setShifts([
        {
          id: '1',
          employeeId: 'emp1',
          date: '2025-08-11',
          startTime: '09:00',
          endTime: '17:00',
          position: 'Entwickler',
          department: 'IT',
          status: 'CONFIRMED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          employeeId: 'emp2',
          date: '2025-08-11',
          startTime: '10:00',
          endTime: '18:00',
          position: 'Designer',
          department: 'Marketing',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      setTemplates([
        {
          id: '1',
          name: 'Standard Woche',
          description: 'Reguläre Arbeitszeiten Mo-Fr',
          isActive: true,
          shifts: [
            {
              employeeId: '',
              startTime: '09:00',
              endTime: '17:00',
              position: '',
              department: '',
              status: 'PLANNED',
            },
          ],
        },
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Dienstplandaten:', error);
      toast.error('Fehler beim Laden der Dienstplandaten');
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = (startDate: Date) => {
    const days = [];
    const start = new Date(startDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
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
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Vorlage
          </Button>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
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

            {/* Time Slots */}
            {Array.from({ length: 12 }, (_, hour) => hour + 8).map(hour => (
              <React.Fragment key={hour}>
                <div className="text-sm text-gray-600 p-2 border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayShifts = getShiftsForDate(day);
                  const hourShifts = dayShifts.filter(shift => {
                    const startHour = parseInt(shift.startTime.split(':')[0]);
                    const endHour = parseInt(shift.endTime.split(':')[0]);
                    return startHour <= hour && hour < endHour;
                  });

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className="min-h-[60px] border border-gray-200 p-1"
                    >
                      {hourShifts.map(shift => {
                        const employee = employees.find(emp => emp.id === shift.employeeId);
                        return (
                          <div
                            key={shift.id}
                            className="bg-[#14ad9f] bg-opacity-20 border-l-4 border-[#14ad9f] p-2 rounded text-xs cursor-pointer hover:bg-opacity-30 transition-colors"
                            onClick={() => {
                              setSelectedShift(shift);
                              setShowShiftDialog(true);
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
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Monatsansicht</h3>
              <p className="text-gray-600">Die Monatsansicht wird bald verfügbar sein.</p>
            </CardContent>
          </Card>
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
                  <select className="w-full mt-1 p-2 border border-gray-300 rounded-md">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full mt-1 p-2 border border-gray-300 rounded-md">
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
                  <Input type="time" defaultValue={selectedShift.startTime} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Endzeit</label>
                  <Input type="time" defaultValue={selectedShift.endTime} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notizen</label>
                <Input
                  placeholder="Zusätzliche Informationen..."
                  defaultValue={selectedShift.notes}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">Speichern</Button>
                </div>
              </div>
            </div>
          )}
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
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              Erste Schicht erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
