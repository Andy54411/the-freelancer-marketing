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
  Clock,
  Play,
  Pause,
  Square,
  Calendar,
  Users,
  Timer,
  TrendingUp,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Filter,
  Search,
  BarChart3,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TimeEntry {
  id: string;
  employeeId: string;
  employee?: Employee;
  projectId?: string;
  projectName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  breakTime: number; // in minutes
  description: string;
  category: 'WORK' | 'OVERTIME' | 'BREAK' | 'SICK' | 'VACATION';
  status: 'ACTIVE' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TimesheetSummary {
  employeeId: string;
  totalHours: number;
  workingDays: number;
  overtimeHours: number;
  sickDays: number;
  vacationDays: number;
  targetHours: number;
}

export default function TimesheetPage({ params }: { params: { uid: string } }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [summaries, setSummaries] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
    if (user && params.uid) {
      loadData();
    }
  }, [user, params.uid, selectedWeek, selectedEmployee]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployees(params.uid);
      setEmployees(employeeData.filter(emp => emp.isActive));

      // TODO: Implement timesheet loading from Firestore
      // const timeData = await TimesheetService.getTimeEntries(params.uid, selectedWeek, selectedEmployee);
      // setTimeEntries(timeData);

      // Mock data for demo
      const mockEntries: TimeEntry[] = [
        {
          id: '1',
          employeeId: 'emp1',
          date: '2025-08-11',
          startTime: '09:00',
          endTime: '17:30',
          duration: 480, // 8 hours
          breakTime: 30,
          description: 'Entwicklung neue Features',
          category: 'WORK',
          status: 'COMPLETED',
          isManual: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          employeeId: 'emp1',
          date: '2025-08-12',
          startTime: '09:15',
          endTime: '18:00',
          duration: 495, // 8.25 hours
          breakTime: 30,
          description: 'Bug fixes und Code Review',
          category: 'WORK',
          status: 'COMPLETED',
          isManual: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          employeeId: 'emp2',
          date: '2025-08-11',
          startTime: '10:00',
          endTime: '18:30',
          duration: 480, // 8 hours
          breakTime: 30,
          description: 'Design System Update',
          category: 'WORK',
          status: 'APPROVED',
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setTimeEntries(mockEntries);

      // Calculate summaries
      const employeeSummaries = employeeData.map(emp => {
        const empEntries = mockEntries.filter(entry => entry.employeeId === emp.id);
        const totalMinutes = empEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const workEntries = empEntries.filter(entry => entry.category === 'WORK');
        const overtimeMinutes = Math.max(0, totalMinutes - emp.workingHours.weekly * 60);

        return {
          employeeId: emp.id!,
          totalHours: totalMinutes / 60,
          workingDays: workEntries.length,
          overtimeHours: overtimeMinutes / 60,
          sickDays: empEntries.filter(entry => entry.category === 'SICK').length,
          vacationDays: empEntries.filter(entry => entry.category === 'VACATION').length,
          targetHours: emp.workingHours.weekly,
        };
      });

      setSummaries(employeeSummaries);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Zeiterfassung:', error);
      toast.error('Fehler beim Laden der Zeiterfassung');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async (employeeId: string) => {
    try {
      // TODO: Implement timer start in Firestore
      setActiveTimer(employeeId);
      toast.success('Timer gestartet');
    } catch (error) {
      console.error('❌ Fehler beim Starten des Timers:', error);
      toast.error('Fehler beim Starten des Timers');
    }
  };

  const stopTimer = async (employeeId: string) => {
    try {
      // TODO: Implement timer stop in Firestore
      setActiveTimer(null);
      toast.success('Timer gestoppt');
    } catch (error) {
      console.error('❌ Fehler beim Stoppen des Timers:', error);
      toast.error('Fehler beim Stoppen des Timers');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'WORK':
        return 'bg-blue-100 text-blue-800';
      case 'OVERTIME':
        return 'bg-orange-100 text-orange-800';
      case 'BREAK':
        return 'bg-gray-100 text-gray-800';
      case 'SICK':
        return 'bg-red-100 text-red-800';
      case 'VACATION':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'WORK':
        return 'Arbeit';
      case 'OVERTIME':
        return 'Überstunden';
      case 'BREAK':
        return 'Pause';
      case 'SICK':
        return 'Krank';
      case 'VACATION':
        return 'Urlaub';
      default:
        return category;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}h`;
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

  const weekDays = getWeekDays(selectedWeek);
  const filteredEntries =
    selectedEmployee === 'all'
      ? timeEntries
      : timeEntries.filter(entry => entry.employeeId === selectedEmployee);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Zeiterfassung</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zeiterfassung</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Arbeitszeiten für {employees.length} Mitarbeiter
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Zeit erfassen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Mitarbeiter</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-[#14ad9f] focus:ring-[#14ad9f]"
              >
                <option value="all">Alle Mitarbeiter</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kalenderwoche</label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newWeek = new Date(selectedWeek);
                    newWeek.setDate(newWeek.getDate() - 7);
                    setSelectedWeek(newWeek);
                  }}
                >
                  ←
                </Button>
                <span className="text-sm">
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
                    const newWeek = new Date(selectedWeek);
                    newWeek.setDate(newWeek.getDate() + 7);
                    setSelectedWeek(newWeek);
                  }}
                >
                  →
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timer Cards für aktive Mitarbeiter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.slice(0, 3).map(employee => {
          const isActive = activeTimer === employee.id;
          const summary = summaries.find(s => s.employeeId === employee.id);

          return (
            <Card key={employee.id} className={isActive ? 'border-[#14ad9f] bg-[#14ad9f]/5' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar} />
                      <AvatarFallback className="bg-[#14ad9f] text-white">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1 text-[#14ad9f]">
                      <div className="w-2 h-2 bg-[#14ad9f] rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Aktiv</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Heute:</span>
                    <span className="font-medium">
                      {summary ? formatDuration((summary.totalHours * 60) / 5) : '0:00h'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Diese Woche:</span>
                    <span className="font-medium">
                      {summary ? formatDuration(summary.totalHours * 60) : '0:00h'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Soll:</span>
                    <span className="font-medium">
                      {formatDuration(employee.workingHours.weekly * 60)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {!isActive ? (
                    <Button
                      onClick={() => startTimer(employee.id!)}
                      className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => stopTimer(employee.id!)}
                        variant="outline"
                        className="flex-1 flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stopp
                      </Button>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Wochenübersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Wochenübersicht
          </CardTitle>
          <CardDescription>Zeiterfassung für die ausgewählte Kalenderwoche</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
              <TabsTrigger value="summary">Zusammenfassung</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Mitarbeiter</th>
                      <th className="text-left p-3 font-medium">Datum</th>
                      <th className="text-left p-3 font-medium">Start - Ende</th>
                      <th className="text-left p-3 font-medium">Pause</th>
                      <th className="text-left p-3 font-medium">Dauer</th>
                      <th className="text-left p-3 font-medium">Kategorie</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map(entry => {
                      const employee = employees.find(emp => emp.id === entry.employeeId);

                      return (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={employee?.avatar} />
                                <AvatarFallback className="bg-[#14ad9f] text-white text-xs">
                                  {employee
                                    ? `${employee.firstName[0]}${employee.lastName[0]}`
                                    : '??'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {employee
                                  ? `${employee.firstName} ${employee.lastName}`
                                  : 'Unbekannt'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {new Date(entry.date).toLocaleDateString('de-DE')}
                          </td>
                          <td className="p-3 text-sm">
                            {entry.startTime} - {entry.endTime || 'Läuft...'}
                          </td>
                          <td className="p-3 text-sm">{formatDuration(entry.breakTime)}</td>
                          <td className="p-3 text-sm font-medium">
                            {entry.duration ? formatDuration(entry.duration) : '-'}
                          </td>
                          <td className="p-3">
                            <Badge className={getCategoryColor(entry.category)}>
                              {getCategoryLabel(entry.category)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={getStatusColor(entry.status)}>
                              {entry.status === 'ACTIVE'
                                ? 'Aktiv'
                                : entry.status === 'COMPLETED'
                                  ? 'Abgeschlossen'
                                  : entry.status === 'APPROVED'
                                    ? 'Genehmigt'
                                    : 'Abgelehnt'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTimeEntry(entry);
                                  setShowTimeDialog(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaries.map(summary => {
                  const employee = employees.find(emp => emp.id === summary.employeeId);
                  const progressPercentage = (summary.totalHours / summary.targetHours) * 100;

                  return (
                    <Card key={summary.employeeId}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee?.avatar} />
                            <AvatarFallback className="bg-[#14ad9f] text-white">
                              {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {employee
                                ? `${employee.firstName} ${employee.lastName}`
                                : 'Unbekannt'}
                            </h4>
                            <p className="text-sm text-gray-600">{employee?.position}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Arbeitszeit</span>
                            <span className="font-medium">
                              {formatDuration(summary.totalHours * 60)} /{' '}
                              {formatDuration(summary.targetHours * 60)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Arbeitstage:</span>
                              <span className="font-medium ml-2">{summary.workingDays}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Überstunden:</span>
                              <span className="font-medium ml-2">
                                {formatDuration(summary.overtimeHours * 60)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Krankheitstage:</span>
                              <span className="font-medium ml-2">{summary.sickDays}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Urlaubstage:</span>
                              <span className="font-medium ml-2">{summary.vacationDays}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Entry Dialog */}
      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Details dieses Zeiteintrags</DialogDescription>
          </DialogHeader>
          {selectedTimeEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Startzeit</label>
                  <Input type="time" defaultValue={selectedTimeEntry.startTime} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Endzeit</label>
                  <Input type="time" defaultValue={selectedTimeEntry.endTime} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Pause (Minuten)</label>
                <Input type="number" defaultValue={selectedTimeEntry.breakTime} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <Input
                  placeholder="Was wurde gemacht..."
                  defaultValue={selectedTimeEntry.description}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategorie</label>
                <select
                  defaultValue={selectedTimeEntry.category}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="WORK">Arbeit</option>
                  <option value="OVERTIME">Überstunden</option>
                  <option value="BREAK">Pause</option>
                  <option value="SICK">Krank</option>
                  <option value="VACATION">Urlaub</option>
                </select>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="destructive">Löschen</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowTimeDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">Speichern</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* No Entries State */}
      {filteredEntries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Zeiteinträge</h3>
            <p className="text-gray-600 mb-6">
              {selectedEmployee === 'all'
                ? 'Für diese Woche wurden noch keine Zeiten erfasst.'
                : 'Für diesen Mitarbeiter wurden noch keine Zeiten erfasst.'}
            </p>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              Erste Zeit erfassen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
