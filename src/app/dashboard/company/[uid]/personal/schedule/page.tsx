'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee, Shift } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Save,
  Download,
  Settings,
  Plus,
  MoreHorizontal,
  Pencil,
  Key,
  Cloud,
  Gift,
  X,
  Trash2,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Erweitere Window für Realtime-Subscriptions
declare global {
  interface Window {
    employeesUnsubscribe?: () => void;
    shiftsUnsubscribe?: () => void;
  }
}

interface SchedulePageProps {
  params: Promise<{
    uid: string;
  }>;
}

// Schichttypen
type ShiftType = 'fruehschicht' | 'spaetschicht' | 'nachtschicht' | 'frei' | 'urlaub' | 'krank' | 'wunschfrei' | 'guttagefrei';

interface ShiftTemplate {
  id: ShiftType;
  name: string;
  shortName: string;
  startTime: string;
  endTime: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'fruehschicht',
    name: 'Frühschicht',
    shortName: 'Früh',
    startTime: '07:00',
    endTime: '14:00',
    color: '#10b981',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
  },
  {
    id: 'spaetschicht',
    name: 'Spätschicht',
    shortName: 'Spät',
    startTime: '15:00',
    endTime: '20:00',
    color: '#f97316',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
  },
  {
    id: 'nachtschicht',
    name: 'Nachtschicht',
    shortName: 'Nacht',
    startTime: '22:00',
    endTime: '06:00',
    color: '#6366f1',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-300',
  },
  {
    id: 'frei',
    name: 'Freier Tag',
    shortName: 'Frei',
    startTime: '',
    endTime: '',
    color: '#9ca3af',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
  },
  {
    id: 'guttagefrei',
    name: 'Guttageabbau',
    shortName: 'Guttage',
    startTime: '',
    endTime: '',
    color: '#14b8a6',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-300',
  },
  {
    id: 'urlaub',
    name: 'Urlaub',
    shortName: 'Urlaub',
    startTime: '',
    endTime: '',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  {
    id: 'krank',
    name: 'Krankheit',
    shortName: 'Krank',
    startTime: '',
    endTime: '',
    color: '#dc2626',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
  },
  {
    id: 'wunschfrei',
    name: 'Wunschfrei',
    shortName: 'Wunsch',
    startTime: '',
    endTime: '',
    color: '#f43f5e',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300',
  },
];

// Hilfsfunktionen
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekDates(date: Date): Date[] {
  const week: Date[] = [];
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    week.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return week;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calculateHoursFromShift(shift: Shift): number {
  if (!shift.startTime || !shift.endTime) return 0;
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);
  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24;
  return hours;
}

export default function SchedulePage({ params }: SchedulePageProps) {
  const { user } = useAuth();
  const [resolvedParams, setResolvedParams] = useState<{ uid: string } | null>(null);

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form State
  const [newShiftForm, setNewShiftForm] = useState({
    shiftType: '' as ShiftType | '',
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });

  // Berechnete Werte
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekNumber = useMemo(() => getWeekNumber(currentDate), [currentDate]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => emp.isActive)
      .filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Schichten pro Mitarbeiter und Tag
  const shiftsByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach(shift => {
      const key = `${shift.employeeId}-${shift.date}`;
      map.set(key, shift);
    });
    return map;
  }, [shifts]);

  // Wochenstunden pro Mitarbeiter
  const weeklyHours = useMemo(() => {
    const hours = new Map<string, number>();
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);
    
    shifts.forEach(shift => {
      if (shift.date >= weekStart && shift.date <= weekEnd) {
        const current = hours.get(shift.employeeId) || 0;
        hours.set(shift.employeeId, current + calculateHoursFromShift(shift));
      }
    });
    return hours;
  }, [shifts, weekDates]);

  // Betriebskennzahlen
  const dailyStats = useMemo(() => {
    return weekDates.map(date => {
      const dateStr = formatDate(date);
      const dayShifts = shifts.filter(s => s.date === dateStr);
      let totalHours = 0;
      dayShifts.forEach(s => {
        totalHours += calculateHoursFromShift(s);
      });
      return {
        date: dateStr,
        shiftsCount: dayShifts.length,
        totalHours,
      };
    });
  }, [shifts, weekDates]);

  // Cleanup Subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (window.employeesUnsubscribe) {
      window.employeesUnsubscribe();
      window.employeesUnsubscribe = undefined;
    }
    if (window.shiftsUnsubscribe) {
      window.shiftsUnsubscribe();
      window.shiftsUnsubscribe = undefined;
    }
  }, []);

  // Realtime Subscriptions Setup
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!resolvedParams?.uid) return;

    setLoading(true);

    const employeesUnsubscribe = PersonalService.subscribeToEmployees(
      resolvedParams.uid,
      employeeList => {
        setEmployees(employeeList);
      },
      () => {
        toast.error('Fehler beim Laden der Mitarbeiter');
      }
    );

    const shiftsUnsubscribe = PersonalService.subscribeToShifts(
      resolvedParams.uid,
      shiftList => {
        setShifts(shiftList);
        setLoading(false);
      },
      () => {
        toast.error('Fehler beim Laden der Schichten');
        setLoading(false);
      }
    );

    window.employeesUnsubscribe = employeesUnsubscribe;
    window.shiftsUnsubscribe = shiftsUnsubscribe;
  }, [resolvedParams]);

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  // Load data
  useEffect(() => {
    if (resolvedParams?.uid) {
      setupRealtimeSubscriptions();
    }
    return () => cleanupSubscriptions();
  }, [resolvedParams, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Schichttyp ermitteln
  const getShiftType = (shift: Shift): ShiftType => {
    if (shift.status === 'ABSENT') return 'urlaub';
    if (shift.status === 'SICK') return 'krank';
    if (shift.notes?.toLowerCase().includes('wunschfrei')) return 'wunschfrei';
    if (shift.notes?.toLowerCase().includes('guttage')) return 'guttagefrei';
    if (!shift.startTime) return 'frei';
    
    const startHour = parseInt(shift.startTime.split(':')[0]);
    if (startHour >= 5 && startHour < 12) return 'fruehschicht';
    if (startHour >= 12 && startHour < 18) return 'spaetschicht';
    return 'nachtschicht';
  };

  // Quick Shift erstellen
  const handleQuickShiftCreate = async (template: ShiftTemplate, employeeId: string, date: string) => {
    if (!resolvedParams?.uid) return;

    try {
      const employee = employees.find(emp => emp.id === employeeId);
      const existingShift = shiftsByEmployeeAndDate.get(`${employeeId}-${date}`);

      const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: resolvedParams.uid,
        employeeId,
        date,
        startTime: template.startTime,
        endTime: template.endTime,
        position: employee?.position || 'Mitarbeiter',
        department: employee?.department || 'Allgemein',
        notes: template.name,
        status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
      };

      if (existingShift?.id) {
        await PersonalService.updateShift(resolvedParams.uid, existingShift.id, shiftData);
        toast.success(`${template.name} aktualisiert`);
      } else {
        await PersonalService.createShift(shiftData);
        toast.success(`${template.name} erstellt`);
      }
      setHasChanges(true);
    } catch {
      toast.error('Fehler beim Erstellen der Schicht');
    }
  };

  // Schicht speichern
  const handleSaveShift = async () => {
    if (!resolvedParams?.uid) return;
    if (!newShiftForm.shiftType) {
      toast.error('Bitte Schichttyp auswählen');
      return;
    }

    try {
      const template = SHIFT_TEMPLATES.find(t => t.id === newShiftForm.shiftType);
      if (!template) return;

      if (editingShift?.id) {
        await PersonalService.updateShift(resolvedParams.uid, editingShift.id, {
          startTime: template.startTime || newShiftForm.startTime,
          endTime: template.endTime || newShiftForm.endTime,
          notes: template.name + (newShiftForm.notes ? ` - ${newShiftForm.notes}` : ''),
          status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
        });
        toast.success('Schicht aktualisiert');
      } else if (selectedCell) {
        const employee = employees.find(emp => emp.id === selectedCell.employeeId);
        const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
          companyId: resolvedParams.uid,
          employeeId: selectedCell.employeeId,
          date: selectedCell.date,
          startTime: template.startTime || newShiftForm.startTime,
          endTime: template.endTime || newShiftForm.endTime,
          position: employee?.position || 'Mitarbeiter',
          department: employee?.department || 'Allgemein',
          notes: template.name + (newShiftForm.notes ? ` - ${newShiftForm.notes}` : ''),
          status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
        };
        await PersonalService.createShift(shiftData);
        toast.success('Schicht erstellt');
      }

      setShowCreateDialog(false);
      setEditingShift(null);
      setSelectedCell(null);
      setHasChanges(true);
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  // Schicht löschen
  const handleDeleteShift = async () => {
    if (!resolvedParams?.uid || !editingShift?.id) return;

    try {
      await PersonalService.deleteShift(resolvedParams.uid, editingShift.id);
      toast.success('Schicht gelöscht');
      setShowCreateDialog(false);
      setEditingShift(null);
      setHasChanges(true);
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  // Render Schicht-Zelle
  const renderShiftCell = (employeeId: string, date: string) => {
    const shift = shiftsByEmployeeAndDate.get(`${employeeId}-${date}`);
    
    if (!shift) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full h-full min-h-[60px] border border-dashed border-gray-200 rounded hover:border-[#14ad9f] hover:bg-gray-50 transition-colors flex items-center justify-center group"
            >
              <Plus className="h-4 w-4 text-gray-300 group-hover:text-[#14ad9f]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
              Arbeitseinsatz hinzufügen:
            </div>
            <DropdownMenuSeparator />
            {SHIFT_TEMPLATES.map(template => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleQuickShiftCreate(template, employeeId, date)}
                className="cursor-pointer"
              >
                <div className={cn('w-3 h-3 rounded mr-2', template.bgColor, template.borderColor, 'border')} />
                <span>{template.name}</span>
                {template.startTime && (
                  <span className="ml-auto text-xs text-gray-400">
                    {template.startTime}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    const template = SHIFT_TEMPLATES.find(t => t.id === getShiftType(shift));
    const isAbsence = shift.status === 'ABSENT' || shift.status === 'SICK' || !shift.startTime;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'w-full h-full min-h-[60px] rounded border p-1.5 text-left transition-colors hover:opacity-80',
              template?.bgColor || 'bg-gray-100',
              template?.borderColor || 'border-gray-300',
              template?.textColor || 'text-gray-700'
            )}
          >
            {isAbsence && (
              <div className="flex items-center gap-1 mb-0.5">
                <X className="h-3 w-3" />
                <span className="text-xs font-medium">{template?.name || 'Frei'}</span>
              </div>
            )}
            {!isAbsence && (
              <>
                <div className="text-xs font-semibold truncate">
                  {template?.name || shift.position}
                </div>
                <div className="text-[10px] opacity-80">
                  {shift.startTime} - {shift.endTime}
                </div>
              </>
            )}
            {isAbsence && shift.status !== 'SICK' && shift.status !== 'ABSENT' && (
              <div className="text-[10px] opacity-70">ganztägig</div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            Schicht ändern:
          </div>
          <DropdownMenuSeparator />
          {SHIFT_TEMPLATES.map(t => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => handleQuickShiftCreate(t, employeeId, date)}
              className="cursor-pointer"
            >
              <div className={cn('w-3 h-3 rounded mr-2', t.bgColor, t.borderColor, 'border')} />
              <span>{t.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setEditingShift(shift);
              setNewShiftForm({
                shiftType: getShiftType(shift),
                startTime: shift.startTime || '09:00',
                endTime: shift.endTime || '17:00',
                notes: shift.notes || '',
              });
              setShowCreateDialog(true);
            }}
            className="cursor-pointer"
          >
            <Pencil className="h-3 w-3 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              if (shift.id && resolvedParams?.uid) {
                await PersonalService.deleteShift(resolvedParams.uid, shift.id);
                toast.success('Schicht gelöscht');
              }
            }}
            className="cursor-pointer text-red-600"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Wunschfrei-Indikator
  const renderWunschfreiIndicator = (employeeId: string) => {
    const hasWunschfrei = weekDates.some(date => {
      const shift = shiftsByEmployeeAndDate.get(`${employeeId}-${formatDate(date)}`);
      return shift?.notes?.toLowerCase().includes('wunschfrei');
    });

    if (!hasWunschfrei) return null;

    return (
      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 rounded-full" title="Wunschfrei" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="px-4 py-3">
          {/* Top Row - Navigation & Actions */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Zeitraum */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Zeitraum</span>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-sm">
                Heute
              </Button>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm font-medium min-w-[140px] text-center">
                  {formatDate(weekDates[0]).slice(8)}.{formatDate(weekDates[0]).slice(5, 7)} - {formatDate(weekDates[6]).slice(8)}.{formatDate(weekDates[6]).slice(5, 7)}.{currentDate.getFullYear()}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Ansicht */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Ansicht</span>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('rounded-none h-8', viewMode === 'grid' && 'bg-[#14ad9f] hover:bg-[#0d9488]')}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('rounded-none h-8', viewMode === 'list' && 'bg-[#14ad9f] hover:bg-[#0d9488]')}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Anzeige Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Anzeige</span>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Alle Abteilungen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Aktionen</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportieren">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Aktualisieren">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Einstellungen">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Save & Publish */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasChanges}>
                Speichern
              </Button>
              <Button size="sm" className="bg-[#14ad9f] hover:bg-[#0d9488]">
                Dienstplan öffentlich
              </Button>
            </div>
          </div>

          {/* Week Info Row */}
          <div className="flex items-start gap-4">
            {/* KW Info */}
            <div className="min-w-[180px] pr-4 border-r">
              <div className="text-lg font-bold text-gray-900">KW {weekNumber}</div>
              <div className="text-sm text-gray-500">Jahr {currentDate.getFullYear()}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Gift className="h-3 w-3" />
                <span>Geburtstage</span>
              </div>
            </div>

            {/* Tage Header */}
            <div className="flex-1 grid grid-cols-7 gap-2">
              {weekDates.map((date, index) => {
                const isToday = formatDate(date) === formatDate(new Date());
                const dayName = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][index];
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'text-center py-2 rounded-lg',
                      isToday && 'bg-[#14ad9f]/10 border border-[#14ad9f]'
                    )}
                  >
                    <div className={cn(
                      'text-lg font-bold',
                      isToday ? 'text-[#14ad9f]' : 'text-gray-900',
                      (index === 5 || index === 6) && 'text-gray-400'
                    )}>
                      {dayName} {date.getDate().toString().padStart(2, '0')}.{(date.getMonth() + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Cloud className="h-3 w-3" />
                      <span>--°C</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stunden Header */}
            <div className="min-w-20 text-center text-sm font-medium text-gray-500">
              Stunden
            </div>
          </div>
        </div>
      </div>

      {/* Dienstplan Grid */}
      <div className="p-4">
        {/* Abteilungen */}
        {(selectedDepartment === 'all' ? departments : [selectedDepartment]).map(department => (
          <div key={department} className="mb-6">
            {/* Abteilung Header */}
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#14ad9f]">
                <span>−</span>
                <span>{department}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Key className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Mitarbeiter Zeilen */}
            <div className="bg-white rounded-lg border overflow-hidden">
              {filteredEmployees
                .filter(emp => emp.department === department || selectedDepartment !== 'all')
                .map(employee => {
                  const hours = weeklyHours.get(employee.id || '') || 0;
                  
                  return (
                    <div
                      key={employee.id}
                      className="flex items-stretch border-b last:border-b-0 hover:bg-gray-50/50"
                    >
                      {/* Mitarbeiter Info */}
                      <div className="min-w-[180px] p-2 flex items-center gap-2 border-r bg-gray-50/50 relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.avatar} />
                          <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {employee.employmentType === 'FULL_TIME' ? 'Vollzeit' :
                             employee.employmentType === 'PART_TIME' ? 'Teilzeit' :
                             employee.employmentType === 'INTERN' ? 'Praktikant' :
                             employee.position || 'Mitarbeiter'}
                          </div>
                        </div>
                        {renderWunschfreiIndicator(employee.id || '')}
                      </div>

                      {/* Schicht-Zellen */}
                      <div className="flex-1 grid grid-cols-7 gap-1 p-1">
                        {weekDates.map((date, index) => (
                          <div key={index} className="min-h-[60px]">
                            {renderShiftCell(employee.id || '', formatDate(date))}
                          </div>
                        ))}
                      </div>

                      {/* Stunden */}
                      <div className="min-w-20 flex items-center justify-center border-l bg-gray-50/50">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{Math.round(hours)}</div>
                          <div className="flex items-center justify-center gap-0.5 text-gray-400">
                            <RefreshCw className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Fallback wenn keine Abteilungen */}
        {departments.length === 0 && filteredEmployees.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg border overflow-hidden">
              {filteredEmployees.map(employee => {
                const hours = weeklyHours.get(employee.id || '') || 0;
                
                return (
                  <div
                    key={employee.id}
                    className="flex items-stretch border-b last:border-b-0 hover:bg-gray-50/50"
                  >
                    <div className="min-w-[180px] p-2 flex items-center gap-2 border-r bg-gray-50/50 relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                          {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {employee.position || 'Mitarbeiter'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-7 gap-1 p-1">
                      {weekDates.map((date, index) => (
                        <div key={index} className="min-h-[60px]">
                          {renderShiftCell(employee.id || '', formatDate(date))}
                        </div>
                      ))}
                    </div>

                    <div className="min-w-20 flex items-center justify-center border-l bg-gray-50/50">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{Math.round(hours)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Betriebskennzahlen */}
        <div className="mt-8 bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Betriebskennzahlen</h3>
          
          <div className="space-y-3">
            {/* Kostenlimit */}
            <div className="flex items-center">
              <div className="min-w-[120px] text-sm text-gray-600">Kostenlimit</div>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {dailyStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-sm font-medium">{stat.totalHours}</div>
                    <div className="h-6 bg-gray-100 rounded relative mt-1">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#14ad9f]/20 rounded"
                        style={{ width: `${Math.min((stat.totalHours / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="min-w-20 text-center text-sm font-bold">
                {Math.round(dailyStats.reduce((acc, s) => acc + s.totalHours, 0))} h
              </div>
            </div>

            {/* Produktivität */}
            <div className="flex items-center">
              <div className="min-w-[120px] text-sm text-gray-600">Produktivität</div>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {dailyStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="h-8 bg-gray-100 rounded relative flex items-end justify-center gap-0.5 p-1">
                      <div className="w-1.5 bg-[#14ad9f] rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
                      <div className="w-1.5 bg-[#14ad9f]/60 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
                      <div className="w-1.5 bg-[#14ad9f]/30 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="min-w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Schicht bearbeiten' : 'Neue Schicht erstellen'}
            </DialogTitle>
            <DialogDescription>
              {selectedCell && employees.find(e => e.id === selectedCell.employeeId)?.firstName}{' '}
              {selectedCell && employees.find(e => e.id === selectedCell.employeeId)?.lastName} am{' '}
              {selectedCell?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Schichttyp Grid */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Schichttyp</Label>
              <div className="grid grid-cols-2 gap-2">
                {SHIFT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setNewShiftForm(prev => ({ ...prev, shiftType: template.id }))}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      newShiftForm.shiftType === template.id
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-gray-300',
                      template.bgColor
                    )}
                  >
                    <div className={cn('font-medium text-sm', template.textColor)}>
                      {template.name}
                    </div>
                    {template.startTime && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {template.startTime} - {template.endTime}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Time */}
            {newShiftForm.shiftType && ['fruehschicht', 'spaetschicht', 'nachtschicht'].includes(newShiftForm.shiftType) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Startzeit</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newShiftForm.startTime}
                    onChange={e => setNewShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Endzeit</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newShiftForm.endTime}
                    onChange={e => setNewShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Notizen */}
            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Optionale Notizen..."
                value={newShiftForm.notes}
                onChange={e => setNewShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              {editingShift && (
                <Button variant="destructive" onClick={handleDeleteShift}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  setEditingShift(null);
                  setSelectedCell(null);
                }}>
                  Abbrechen
                </Button>
                <Button onClick={handleSaveShift} className="bg-[#14ad9f] hover:bg-[#0d9488]">
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
