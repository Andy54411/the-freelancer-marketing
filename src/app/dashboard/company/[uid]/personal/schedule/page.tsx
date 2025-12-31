'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee, Shift } from '@/services/personalService';
import { logShiftCreated, logShiftUpdated, logShiftDeleted } from '@/lib/employeeActivityLogger';
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
  const { user, userRole } = useAuth();
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
  const [weatherData, setWeatherData] = useState<Map<string, { temp: number; icon: string }>>(new Map());
  const [isPublished, setIsPublished] = useState(false);
  const [copiedShifts, setCopiedShifts] = useState<Shift[]>([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);

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
      .filter(emp => emp.id) // Nur Mitarbeiter mit ID
      .filter(emp => emp.isActive)
      .filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment) as (Employee & { id: string })[];
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

  // Verfügbare/Freie Stunden pro Mitarbeiter (Soll - Ist)
  const availableHours = useMemo(() => {
    const available = new Map<string, { target: number; planned: number; free: number }>();
    
    employees
      .filter(emp => emp.id)
      .forEach(emp => {
        const empId = emp.id as string;
        // Wöchentliche Sollstunden aus Vertragsdaten
        const weeklyTarget = emp.workingHours?.weekly ?? 
          (emp.employmentType === 'FULL_TIME' ? 40 :
           emp.employmentType === 'PART_TIME' ? 20 :
           emp.employmentType === 'MINIJOB' ? 10 :
           emp.employmentType === 'WERKSTUDENT' ? 20 :
           emp.employmentType === 'AUSHILFE' ? 15 : 40);
        
        const planned = weeklyHours.get(empId) ?? 0;
        const free = weeklyTarget - planned;
        
        available.set(empId, {
          target: weeklyTarget,
          planned,
          free: Math.max(0, free), // Keine negativen freien Stunden
        });
      });
    
    return available;
  }, [employees, weeklyHours]);

  // Geburtstage in der Woche
  const birthdaysInWeek = useMemo(() => {
    const birthdays: { employeeId: string; name: string; date: string; day: number }[] = [];
    employees
      .filter(emp => emp.id && emp.dateOfBirth)
      .forEach(emp => {
        const empId = emp.id as string;
        const dob = emp.dateOfBirth as string;
        // dateOfBirth ist im Format YYYY-MM-DD
        const birthMonth = dob.slice(5, 7);
        const birthDay = dob.slice(8, 10);
        
        weekDates.forEach((date, index) => {
          const dateMonth = (date.getMonth() + 1).toString().padStart(2, '0');
          const dateDay = date.getDate().toString().padStart(2, '0');
          
          if (birthMonth === dateMonth && birthDay === dateDay) {
            birthdays.push({
              employeeId: empId,
              name: `${emp.firstName} ${emp.lastName}`,
              date: formatDate(date),
              day: index,
            });
          }
        });
      });
    return birthdays;
  }, [employees, weekDates]);

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

  // Wetter laden (OpenWeatherMap kostenlose API)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Koordinaten für Deutschland (Berlin als Default)
        const lat = 52.52;
        const lon = 13.405;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,weathercode&timezone=Europe/Berlin`
        );
        if (response.ok) {
          const data = await response.json();
          const newWeatherData = new Map<string, { temp: number; icon: string }>();
          data.daily.time.forEach((date: string, index: number) => {
            const temp = Math.round(data.daily.temperature_2m_max[index]);
            const code = data.daily.weathercode[index];
            // Wetter-Icon basierend auf Code
            let icon = 'cloud';
            if (code <= 1) icon = 'sun';
            else if (code <= 3) icon = 'cloud-sun';
            else if (code >= 61 && code <= 67) icon = 'cloud-rain';
            else if (code >= 71 && code <= 77) icon = 'snowflake';
            newWeatherData.set(date, { temp, icon });
          });
          setWeatherData(newWeatherData);
        }
      } catch {
        // Wetter-Fehler ignorieren
      }
    };
    fetchWeather();
  }, [currentDate]);

  // Export-Funktion
  const handleExport = () => {
    const csvContent = [
      ['Mitarbeiter', 'Datum', 'Schicht', 'Start', 'Ende', 'Stunden'].join(','),
      ...shifts
        .filter(shift => shift.employeeId)
        .map(shift => {
          const emp = employees.find(e => e.id === shift.employeeId);
          if (!emp) return null;
          const hours = calculateHoursFromShift(shift);
          return [
            `${emp.firstName} ${emp.lastName}`,
            shift.date,
            shift.notes ?? '-',
            shift.startTime ?? '-',
            shift.endTime ?? '-',
            hours.toFixed(1)
          ].join(',');
        })
        .filter(Boolean)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Dienstplan_KW${weekNumber}_${currentDate.getFullYear()}.csv`;
    link.click();
    toast.success('Dienstplan exportiert');
  };

  // Dienstplan veröffentlichen
  const handlePublish = async () => {
    if (!resolvedParams?.uid) return;
    setIsPublished(true);
    toast.success('Dienstplan wurde veröffentlicht');
    // TODO: Hier könnte eine Benachrichtigung an alle Mitarbeiter gesendet werden
  };

  // Woche kopieren für eine Abteilung
  const handleCopyWeek = (department: string) => {
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);
    const deptShifts = shifts.filter(s => 
      s.department === department && 
      s.date >= weekStart && 
      s.date <= weekEnd
    );
    
    if (deptShifts.length === 0) {
      toast.error('Keine Schichten zum Kopieren in dieser Woche');
      return;
    }
    
    setCopiedShifts(deptShifts);
    toast.success(`${deptShifts.length} Schichten kopiert - Navigiere zur Zielwoche und klicke "Einfügen"`);
  };

  // Woche einfügen für eine Abteilung
  const handlePasteWeek = async (department: string) => {
    if (!resolvedParams?.uid || copiedShifts.length === 0) {
      toast.error('Keine Schichten zum Einfügen');
      return;
    }

    try {
      const weekStart = weekDates[0];
      let pastedCount = 0;

      for (const shift of copiedShifts) {
        // Berechne den Wochentag der Original-Schicht
        const originalDate = new Date(shift.date);
        const dayOfWeek = originalDate.getDay() === 0 ? 6 : originalDate.getDay() - 1; // Mo=0, So=6
        
        // Berechne das neue Datum in der Zielwoche
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + dayOfWeek);
        
        const newShiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
          ...shift,
          date: formatDate(newDate),
          companyId: resolvedParams.uid,
        };
        delete (newShiftData as Partial<Shift>).id;
        
        const shiftId = await PersonalService.createShift(newShiftData);
        
        // Mitarbeiter-Aktivität loggen (nur wenn Mitarbeiter)
        if (userRole === 'mitarbeiter') {
          const employee = employees.find(emp => emp.id === shift.employeeId);
          const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt' : 'Unbekannt';
          await logShiftCreated(shiftId, employeeName, formatDate(newDate), shift.notes || 'Schicht');
        }
        
        pastedCount++;
      }

      toast.success(`${pastedCount} Schichten eingefügt`);
      setCopiedShifts([]);
      setHasChanges(true);
    } catch {
      toast.error('Fehler beim Einfügen');
    }
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
      if (!employee) {
        toast.error('Mitarbeiter nicht gefunden');
        return;
      }
      const existingShift = shiftsByEmployeeAndDate.get(`${employeeId}-${date}`);

      const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: resolvedParams.uid,
        employeeId,
        date,
        startTime: template.startTime,
        endTime: template.endTime,
        position: employee.position,
        department: employee.department,
        notes: template.name,
        status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
      };

      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt';

      if (existingShift?.id) {
        await PersonalService.updateShift(resolvedParams.uid, existingShift.id, shiftData);
        
        // Mitarbeiter-Aktivität loggen
        if (userRole === 'mitarbeiter') {
          await logShiftUpdated(existingShift.id, employeeName, date, template.name);
        }
        
        toast.success(`${template.name} aktualisiert`);
      } else {
        const shiftId = await PersonalService.createShift(shiftData);
        
        // Mitarbeiter-Aktivität loggen
        if (userRole === 'mitarbeiter') {
          await logShiftCreated(shiftId, employeeName, date, template.name);
        }
        
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

      // Benutzerdefinierte Zeiten haben Priorität über Template-Zeiten
      const startTime = newShiftForm.startTime || template.startTime;
      const endTime = newShiftForm.endTime || template.endTime;

      if (editingShift?.id) {
        const employee = employees.find(emp => emp.id === editingShift.employeeId);
        const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt' : 'Unbekannt';

        await PersonalService.updateShift(resolvedParams.uid, editingShift.id, {
          startTime,
          endTime,
          notes: template.name + (newShiftForm.notes ? ` - ${newShiftForm.notes}` : ''),
          status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
        });
        
        // Mitarbeiter-Aktivität loggen
        if (userRole === 'mitarbeiter') {
          await logShiftUpdated(editingShift.id, employeeName, editingShift.date, template.name);
        }
        
        toast.success('Schicht aktualisiert');
      } else if (selectedCell) {
        const employee = employees.find(emp => emp.id === selectedCell.employeeId);
        if (!employee) {
          toast.error('Mitarbeiter nicht gefunden');
          return;
        }
        
        const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt';
        
        const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
          companyId: resolvedParams.uid,
          employeeId: selectedCell.employeeId,
          date: selectedCell.date,
          startTime,
          endTime,
          position: employee.position,
          department: employee.department,
          notes: template.name + (newShiftForm.notes ? ` - ${newShiftForm.notes}` : ''),
          status: template.id === 'urlaub' ? 'ABSENT' : template.id === 'krank' ? 'SICK' : 'PLANNED',
        };
        
        const shiftId = await PersonalService.createShift(shiftData);
        
        // Mitarbeiter-Aktivität loggen
        if (userRole === 'mitarbeiter') {
          await logShiftCreated(shiftId, employeeName, selectedCell.date, template.name);
        }
        
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
      const employee = employees.find(emp => emp.id === editingShift.employeeId);
      const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt' : 'Unbekannt';

      await PersonalService.deleteShift(resolvedParams.uid, editingShift.id);
      
      // Mitarbeiter-Aktivität loggen
      if (userRole === 'mitarbeiter') {
        await logShiftDeleted(editingShift.id, employeeName, editingShift.date);
      }
      
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
          <DropdownMenuContent className="w-48 z-50">
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
    
    // Template-Styles mit Frei-Fallback
    const freiTemplate = SHIFT_TEMPLATES.find(t => t.id === 'frei');
    const bgColor = template?.bgColor ?? freiTemplate?.bgColor ?? 'bg-gray-100';
    const borderColor = template?.borderColor ?? freiTemplate?.borderColor ?? 'border-gray-300';
    const textColor = template?.textColor ?? freiTemplate?.textColor ?? 'text-gray-700';
    const templateName = template?.name ?? 'Frei';
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'w-full h-full min-h-[60px] rounded border p-1.5 text-left transition-colors hover:opacity-80',
              bgColor,
              borderColor,
              textColor
            )}
          >
            {isAbsence && (
              <div className="flex items-center gap-1 mb-0.5">
                <X className="h-3 w-3" />
                <span className="text-xs font-medium">{templateName}</span>
              </div>
            )}
            {!isAbsence && (
              <>
                <div className="text-xs font-semibold truncate">
                  {template?.name ?? shift.position}
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
        <DropdownMenuContent className="w-48 z-50">
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
                startTime: shift.startTime ?? '09:00',
                endTime: shift.endTime ?? '17:00',
                notes: shift.notes ?? '',
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
                const employee = employees.find(emp => emp.id === shift.employeeId);
                const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt' : 'Unbekannt';
                
                await PersonalService.deleteShift(resolvedParams.uid, shift.id);
                
                // Mitarbeiter-Aktivität loggen
                if (userRole === 'mitarbeiter') {
                  await logShiftDeleted(shift.id, employeeName, shift.date);
                }
                
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
                <span className="px-3 text-sm font-medium whitespace-nowrap">
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
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportieren" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Aktualisieren" onClick={setupRealtimeSubscriptions}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Einstellungen" onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Save & Publish */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasChanges} onClick={() => { setHasChanges(false); toast.success('Änderungen gespeichert'); }}>
                Speichern
              </Button>
              <Button size="sm" className={isPublished ? 'bg-green-600 hover:bg-green-700' : 'bg-[#14ad9f] hover:bg-[#0d9488]'} onClick={handlePublish}>
                {isPublished ? 'Veröffentlicht' : 'Dienstplan öffentlich'}
              </Button>
            </div>
          </div>

          {/* Week Info Row */}
          <div className="flex items-start gap-4">
            {/* KW Info */}
            <div className="min-w-[180px] pr-4 border-r">
              <div className="text-lg font-bold text-gray-900">KW {weekNumber}</div>
              <div className="text-sm text-gray-500">Jahr {currentDate.getFullYear()}</div>
              {birthdaysInWeek.length > 0 ? (
                <div className="mt-1">
                  {birthdaysInWeek.map((bday, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-pink-600">
                      <Gift className="h-3 w-3" />
                      <span>{bday.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Gift className="h-3 w-3" />
                  <span>Keine Geburtstage</span>
                </div>
              )}
            </div>

            {/* Tage Header */}
            <div className="flex-1 grid grid-cols-7 gap-2">
              {weekDates.map((date, index) => {
                const isToday = formatDate(date) === formatDate(new Date());
                const dayName = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][index];
                const dateStr = formatDate(date);
                const weather = weatherData.get(dateStr);
                
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
                      <span>{weather ? `${weather.temp}°C` : '--°C'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stunden Header */}
            <div className="min-w-[100px] text-center">
              <div className="text-sm font-medium text-gray-500">Geplant</div>
              <div className="text-xs text-gray-400">/ Verfügbar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dienstplan Grid */}
      {viewMode === 'grid' && (
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  title={copiedShifts.length > 0 ? "Woche einfügen" : "Woche kopieren"}
                  onClick={() => {
                    if (copiedShifts.length > 0) {
                      handlePasteWeek(department);
                    } else {
                      handleCopyWeek(department);
                    }
                  }}
                >
                  <Copy className={cn("h-3 w-3", copiedShifts.length > 0 && "text-[#14ad9f]")} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  title="Abteilung bearbeiten"
                  onClick={() => setEditingDepartment(department)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      title="Weitere Optionen"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuItem onClick={() => handleCopyWeek(department)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Woche kopieren
                    </DropdownMenuItem>
                    {copiedShifts.length > 0 && (
                      <DropdownMenuItem onClick={() => handlePasteWeek(department)}>
                        <Download className="h-4 w-4 mr-2" />
                        Woche einfügen ({copiedShifts.length})
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      // Alle Schichten der Abteilung in dieser Woche löschen
                      const weekStart = formatDate(weekDates[0]);
                      const weekEnd = formatDate(weekDates[6]);
                      const deptShifts = shifts.filter(s => 
                        s.department === department && 
                        s.date >= weekStart && 
                        s.date <= weekEnd
                      );
                      if (deptShifts.length === 0) {
                        toast.info('Keine Schichten zum Löschen');
                        return;
                      }
                      if (confirm(`${deptShifts.length} Schichten in ${department} löschen?`)) {
                        for (const shift of deptShifts) {
                          if (shift.id && resolvedParams?.uid) {
                            const employee = employees.find(emp => emp.id === shift.employeeId);
                            const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unbekannt' : 'Unbekannt';
                            
                            await PersonalService.deleteShift(resolvedParams.uid, shift.id);
                            
                            // Mitarbeiter-Aktivität loggen
                            if (userRole === 'mitarbeiter') {
                              await logShiftDeleted(shift.id, employeeName, shift.date);
                            }
                          }
                        }
                        toast.success(`${deptShifts.length} Schichten gelöscht`);
                      }
                    }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Woche leeren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mitarbeiter Zeilen */}
            <div className="bg-white rounded-lg border overflow-hidden">
              {filteredEmployees
                .filter(emp => emp.department === department || selectedDepartment !== 'all')
                .map(employee => {
                  const hours = weeklyHours.get(employee.id) ?? 0;
                  
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
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {employee.firstName} {employee.lastName}
                            </span>
                            {employee.isShiftLeader && (
                              <Key className="h-3 w-3 text-amber-500" aria-label="Schichtleiter" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {employee.isShiftLeader ? 'Schichtleiter' :
                             employee.employmentType === 'FULL_TIME' ? 'Vollzeit' :
                             employee.employmentType === 'PART_TIME' ? 'Teilzeit' :
                             employee.employmentType === 'INTERN' ? 'Praktikant' :
                             employee.position}
                          </div>
                        </div>
                        {renderWunschfreiIndicator(employee.id)}
                      </div>

                      {/* Schicht-Zellen */}
                      <div className="flex-1 grid grid-cols-7 gap-1 p-1">
                        {weekDates.map((date, index) => (
                          <div key={index} className="min-h-[60px]">
                            {renderShiftCell(employee.id, formatDate(date))}
                          </div>
                        ))}
                      </div>

                      {/* Stunden */}
                      <div className="min-w-[100px] flex items-center justify-center border-l bg-gray-50/50">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{Math.round(hours)}h</div>
                          {(() => {
                            const avail = availableHours.get(employee.id);
                            if (!avail) return null;
                            const freeHrs = avail.free;
                            return (
                              <div className={cn(
                                "text-xs font-medium",
                                freeHrs > 0 ? "text-emerald-600" : "text-gray-400"
                              )}>
                                {freeHrs > 0 ? `+${Math.round(freeHrs)}h frei` : 'voll'}
                              </div>
                            );
                          })()}
                          <div className="text-[10px] text-gray-400">
                            Soll: {availableHours.get(employee.id)?.target ?? 40}h
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
                const hours = weeklyHours.get(employee.id) ?? 0;
                
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
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {employee.firstName} {employee.lastName}
                          </span>
                          {employee.isShiftLeader && (
                            <Key className="h-3 w-3 text-amber-500" aria-label="Schichtleiter" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {employee.isShiftLeader ? 'Schichtleiter' : employee.position}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-7 gap-1 p-1">
                      {weekDates.map((date, index) => (
                        <div key={index} className="min-h-[60px]">
                          {renderShiftCell(employee.id, formatDate(date))}
                        </div>
                      ))}
                    </div>

                    <div className="min-w-[100px] flex items-center justify-center border-l bg-gray-50/50">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{Math.round(hours)}h</div>
                        {(() => {
                          const avail = availableHours.get(employee.id);
                          if (!avail) return null;
                          const freeHrs = avail.free;
                          return (
                            <div className={cn(
                              "text-xs font-medium",
                              freeHrs > 0 ? "text-emerald-600" : "text-gray-400"
                            )}>
                              {freeHrs > 0 ? `+${Math.round(freeHrs)}h frei` : 'voll'}
                            </div>
                          );
                        })()}
                        <div className="text-[10px] text-gray-400">
                          Soll: {availableHours.get(employee.id)?.target ?? 40}h
                        </div>
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
      )}

      {/* Dienstplan List-Ansicht */}
      {viewMode === 'list' && (
        <div className="p-4 space-y-4">
          {/* Verfügbare Stunden Übersicht */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Verfügbare Kapazitäten - KW {weekNumber}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredEmployees
                .map(emp => {
                  const avail = availableHours.get(emp.id);
                  return { emp, avail };
                })
                .sort((a, b) => (b.avail?.free ?? 0) - (a.avail?.free ?? 0))
                .map(({ emp, avail }) => (
                  <div 
                    key={emp.id} 
                    className={cn(
                      "p-3 rounded-lg border-2 transition-colors",
                      avail && avail.free > 0 
                        ? "border-emerald-200 bg-emerald-50" 
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={emp.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{emp.firstName} {emp.lastName?.[0]}.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {avail?.planned ?? 0}/{avail?.target ?? 40}h
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        avail && avail.free > 0 ? "text-emerald-600" : "text-gray-400"
                      )}>
                        {avail && avail.free > 0 ? `+${Math.round(avail.free)}h` : 'voll'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Schichten Tabelle */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm">Mitarbeiter</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Abteilung</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Datum</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Schicht</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Zeit</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Stunden</th>
                </tr>
              </thead>
              <tbody>
                {shifts
                  .filter(shift => {
                    const weekStart = formatDate(weekDates[0]);
                    const weekEnd = formatDate(weekDates[6]);
                    return shift.date >= weekStart && shift.date <= weekEnd;
                  })
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(shift => {
                    const employee = employees.find(e => e.id === shift.employeeId);
                    const hours = calculateHoursFromShift(shift);
                    const template = SHIFT_TEMPLATES.find(t => t.id === getShiftType(shift));
                    
                    return (
                      <tr key={shift.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={employee?.avatar} />
                              <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                                {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{employee?.firstName} {employee?.lastName}</span>
                              {employee?.isShiftLeader && (
                                <Key className="h-3 w-3 text-amber-500" aria-label="Schichtleiter" />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{shift.department}</td>
                        <td className="py-3 px-2">
                          {new Date(shift.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-3 px-2">
                          <span className={cn('px-2 py-1 rounded text-xs font-medium', template?.bgColor, template?.textColor)}>
                            {template?.name ?? shift.notes ?? shift.position}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{hours.toFixed(1)}h</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    onClick={() => setNewShiftForm(prev => ({ 
                      ...prev, 
                      shiftType: template.id,
                      // Template-Zeiten als Vorschlag setzen, wenn vorhanden
                      startTime: template.startTime || prev.startTime,
                      endTime: template.endTime || prev.endTime,
                    }))}
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

      {/* Abteilung bearbeiten Dialog */}
      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abteilung: {editingDepartment}</DialogTitle>
            <DialogDescription>
              Schichtleiter und Positionen der Mitarbeiter verwalten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-sm font-medium">Mitarbeiter in dieser Abteilung</Label>
              <div className="mt-2 space-y-3">
                {employees
                  .filter(emp => emp.department === editingDepartment)
                  .map(emp => (
                    <div key={emp.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="text-xs bg-[#14ad9f]/10 text-[#14ad9f]">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                          {emp.isShiftLeader && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              Schichtleiter
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Position</Label>
                          <Input
                            value={emp.position}
                            onChange={async (e) => {
                              if (!emp.id || !resolvedParams?.uid) return;
                              try {
                                await PersonalService.updateEmployee(resolvedParams.uid, emp.id, {
                                  position: e.target.value
                                });
                                setEmployees(prev => prev.map(em => 
                                  em.id === emp.id ? { ...em, position: e.target.value } : em
                                ));
                              } catch {
                                toast.error('Fehler beim Speichern');
                              }
                            }}
                            className="h-8 text-sm"
                            placeholder="z.B. Koch, Kellner..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Rolle</Label>
                          <Select
                            value={emp.roleInDepartment ?? 'MEMBER'}
                            onValueChange={async (value) => {
                              if (!emp.id || !resolvedParams?.uid) return;
                              try {
                                const isLeader = value === 'LEADER' || value === 'SUPERVISOR';
                                await PersonalService.updateEmployee(resolvedParams.uid, emp.id, {
                                  roleInDepartment: value as 'LEADER' | 'SUPERVISOR' | 'MEMBER',
                                  isShiftLeader: isLeader
                                });
                                setEmployees(prev => prev.map(em => 
                                  em.id === emp.id ? { 
                                    ...em, 
                                    roleInDepartment: value as 'LEADER' | 'SUPERVISOR' | 'MEMBER',
                                    isShiftLeader: isLeader 
                                  } : em
                                ));
                                toast.success('Rolle aktualisiert');
                              } catch {
                                toast.error('Fehler beim Speichern');
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LEADER">Schichtleiter</SelectItem>
                              <SelectItem value="SUPERVISOR">Stellvertreter</SelectItem>
                              <SelectItem value="MEMBER">Mitarbeiter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditingDepartment(null)}>
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Einstellungen Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dienstplan-Einstellungen</DialogTitle>
            <DialogDescription>
              Einstellungen für die Dienstplanung
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Schichtvorlagen</Label>
              <div className="mt-2 space-y-2">
                {SHIFT_TEMPLATES.map(template => (
                  <div key={template.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className={cn('w-4 h-4 rounded', template.bgColor)} />
                    <span className="text-sm flex-1">{template.name}</span>
                    <span className="text-xs text-gray-500">{template.startTime} - {template.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
