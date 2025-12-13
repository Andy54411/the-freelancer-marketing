'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Save,
  Share2,
  Plus,
  MoreHorizontal,
  Clock,
  Sun,
  Moon,
  Coffee,
  Plane,
  Heart,
  X,
  Gift,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Shift, Employee } from '@/services/personalService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WeeklyScheduleGridProps {
  shifts: Shift[];
  employees: Employee[];
  onShiftCreate?: (shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onShiftUpdate?: (shiftId: string, updates: Partial<Shift>) => void;
  onShiftDelete?: (shiftId: string) => void;
  companyId: string;
}

// Schichttypen mit Farben
const SHIFT_TYPES = {
  FRUEHSCHICHT: { 
    name: 'Frühschicht', 
    time: '07:00 - 14:00', 
    bg: 'bg-blue-100', 
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: Sun 
  },
  SPAETSCHICHT: { 
    name: 'Spätschicht', 
    time: '15:00 - 20:00', 
    bg: 'bg-purple-100', 
    border: 'border-purple-300',
    text: 'text-purple-800',
    icon: Moon 
  },
  NACHTSCHICHT: { 
    name: 'Nachtschicht', 
    time: '20:00 - 06:00', 
    bg: 'bg-indigo-100', 
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    icon: Moon 
  },
  URLAUB: { 
    name: 'Urlaub', 
    time: 'ganztägig', 
    bg: 'bg-teal-100', 
    border: 'border-teal-300',
    text: 'text-teal-800',
    icon: Plane 
  },
  KRANKHEIT: { 
    name: 'Krankheit', 
    time: 'ganztägig', 
    bg: 'bg-red-100', 
    border: 'border-red-300',
    text: 'text-red-800',
    icon: Heart 
  },
  GUTTAGEABBAU: { 
    name: 'Guttageabbau', 
    time: 'ganztägig', 
    bg: 'bg-green-100', 
    border: 'border-green-300',
    text: 'text-green-800',
    icon: Gift 
  },
  FREI: { 
    name: 'Freier Tag', 
    time: '', 
    bg: 'bg-gray-100', 
    border: 'border-gray-300',
    text: 'text-gray-600',
    icon: Coffee 
  },
  WUNSCHFREI: { 
    name: 'Wunschfrei', 
    time: '', 
    bg: 'bg-pink-100', 
    border: 'border-pink-300',
    text: 'text-pink-600',
    icon: Heart 
  },
};

// Hilfsfunktionen
const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Montag als Start
  startOfWeek.setDate(diff);
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatDateShort = (date: Date): string => {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return `${days[date.getDay()]} ${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getShiftType = (shift: Shift): keyof typeof SHIFT_TYPES => {
  if (shift.status === 'SICK') return 'KRANKHEIT';
  if (shift.status === 'ABSENT') return 'URLAUB';
  
  const startHour = parseInt(shift.startTime?.split(':')[0] || '9');
  if (startHour < 10) return 'FRUEHSCHICHT';
  if (startHour >= 14) return 'SPAETSCHICHT';
  if (startHour >= 20) return 'NACHTSCHICHT';
  return 'FRUEHSCHICHT';
};

const calculateShiftHours = (shift: Shift): number => {
  if (!shift.startTime || !shift.endTime) return 8;
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);
  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24; // Nachtschicht
  return hours;
};

export default function WeeklyScheduleGrid({
  shifts = [],
  employees = [],
  onShiftCreate,
  onShiftUpdate,
  onShiftDelete,
  companyId,
}: WeeklyScheduleGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekNumber = useMemo(() => getWeekNumber(currentDate), [currentDate]);

  // Schichten pro Mitarbeiter und Tag gruppieren
  const shiftsByEmployeeAndDay = useMemo(() => {
    const map: Record<string, Record<string, Shift[]>> = {};
    
    employees.forEach(emp => {
      if (emp.id) {
        map[emp.id] = {};
        weekDates.forEach(date => {
          const dateStr = date.toISOString().split('T')[0];
          map[emp.id][dateStr] = [];
        });
      }
    });
    
    shifts.forEach(shift => {
      if (map[shift.employeeId] && map[shift.employeeId][shift.date]) {
        map[shift.employeeId][shift.date].push(shift);
      }
    });
    
    return map;
  }, [shifts, employees, weekDates]);

  // Wochenstunden pro Mitarbeiter berechnen
  const weeklyHoursByEmployee = useMemo(() => {
    const hours: Record<string, number> = {};
    
    employees.forEach(emp => {
      if (emp.id) {
        const employeeShifts = shifts.filter(s => 
          s.employeeId === emp.id && 
          weekDates.some(d => d.toISOString().split('T')[0] === s.date)
        );
        hours[emp.id] = employeeShifts.reduce((sum, shift) => {
          if (shift.status === 'SICK' || shift.status === 'ABSENT') return sum;
          return sum + calculateShiftHours(shift);
        }, 0);
      }
    });
    
    return hours;
  }, [shifts, employees, weekDates]);

  // Navigation
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Schicht erstellen
  const handleQuickShiftCreate = (employeeId: string, date: string, shiftType: keyof typeof SHIFT_TYPES) => {
    if (!onShiftCreate) return;
    
    const typeInfo = SHIFT_TYPES[shiftType];
    const employee = employees.find(e => e.id === employeeId);
    
    let startTime = '09:00';
    let endTime = '17:00';
    let status: Shift['status'] = 'PLANNED';
    
    switch (shiftType) {
      case 'FRUEHSCHICHT':
        startTime = '07:00';
        endTime = '14:00';
        break;
      case 'SPAETSCHICHT':
        startTime = '15:00';
        endTime = '20:00';
        break;
      case 'NACHTSCHICHT':
        startTime = '20:00';
        endTime = '06:00';
        break;
      case 'URLAUB':
        status = 'ABSENT';
        break;
      case 'KRANKHEIT':
        status = 'SICK';
        break;
      case 'GUTTAGEABBAU':
      case 'FREI':
        status = 'ABSENT';
        break;
    }
    
    onShiftCreate({
      companyId,
      employeeId,
      date,
      startTime,
      endTime,
      position: employee?.position || 'Mitarbeiter',
      department: employee?.department || 'Allgemein',
      status,
      notes: typeInfo.name,
    });
    
    setSelectedCell(null);
    toast.success(`${typeInfo.name} erstellt`);
  };

  // Schichtkarte rendern
  const renderShiftCard = (shift: Shift) => {
    const shiftType = getShiftType(shift);
    const typeInfo = SHIFT_TYPES[shiftType];
    const IconComponent = typeInfo.icon;
    
    return (
      <DropdownMenu key={shift.id}>
        <DropdownMenuTrigger asChild>
          <div 
            className={cn(
              'px-2 py-1 rounded text-xs cursor-pointer border',
              typeInfo.bg,
              typeInfo.border,
              typeInfo.text,
              'hover:opacity-80 transition-opacity'
            )}
          >
            <div className="flex items-center gap-1">
              <IconComponent className="h-3 w-3" />
              <span className="font-medium truncate">{typeInfo.name}</span>
            </div>
            {typeInfo.time && (
              <div className="text-[10px] opacity-75">{shift.startTime} - {shift.endTime}</div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onShiftUpdate?.(shift.id!, { status: 'CONFIRMED' })}>
            Bestätigen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShiftDelete?.(shift.id!)}>
            <X className="h-4 w-4 mr-2 text-red-500" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Betriebskennzahlen berechnen
  const dailyStats = useMemo(() => {
    return weekDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = shifts.filter(s => s.date === dateStr && s.status !== 'SICK' && s.status !== 'ABSENT');
      const totalHours = dayShifts.reduce((sum, s) => sum + calculateShiftHours(s), 0);
      return { date: dateStr, employees: dayShifts.length, hours: totalHours };
    });
  }, [shifts, weekDates]);

  const activeEmployees = employees.filter(emp => emp.isActive);

  return (
    <div className="space-y-4">
      {/* Header mit Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Zeitraum Navigation */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">ZEITRAUM</span>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Heute
              </Button>
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 font-medium text-sm">
                  {weekDates[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {weekDates[6].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <Button variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Ansicht */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">ANSICHT</span>
              <div className="flex border rounded-md">
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">AKTIONEN</span>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4" />
              </Button>
              <Button className="bg-[#14ad9f] hover:bg-[#0d9488] text-white" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Speichern
              </Button>
              <Button variant="outline" size="sm">
                Dienstplan öffentlich
                <Share2 className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wochenheader */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[200px_repeat(7,1fr)_80px] border-b">
            {/* KW Info */}
            <div className="p-3 border-r bg-gray-50">
              <div className="font-bold text-lg">KW {weekNumber}</div>
              <div className="text-sm text-gray-500">Jahr {currentDate.getFullYear()}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Gift className="h-3 w-3" />
                <span>Geburtstage</span>
              </div>
            </div>
            
            {/* Tage */}
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div 
                  key={idx}
                  className={cn(
                    'p-3 border-r text-center',
                    isToday && 'bg-teal-50',
                    isWeekend && 'bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'font-bold',
                    isToday && 'text-[#14ad9f]'
                  )}>
                    {formatDateShort(date)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {/* Wetter-Platzhalter */}
                    <Sun className="h-3 w-3 inline mr-1" />
                    <span>15°C</span>
                  </div>
                </div>
              );
            })}
            
            {/* Stunden-Header */}
            <div className="p-3 bg-gray-50 text-center">
              <Clock className="h-4 w-4 mx-auto text-gray-400" />
            </div>
          </div>

          {/* Mitarbeiter-Zeilen */}
          <div className="divide-y">
            {activeEmployees.map(employee => (
              <div 
                key={employee.id}
                className="grid grid-cols-[200px_repeat(7,1fr)_80px] hover:bg-gray-50/50"
              >
                {/* Mitarbeiter-Info */}
                <div className="p-3 border-r flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-sm">
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {employee.employmentType === 'FULL_TIME' ? 'Vollzeit' : 
                       employee.employmentType === 'PART_TIME' ? 'Teilzeit' : 
                       employee.employmentType}
                    </div>
                  </div>
                </div>

                {/* Schichten pro Tag */}
                {weekDates.map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayShifts = shiftsByEmployeeAndDay[employee.id!]?.[dateStr] || [];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const cellKey = `${employee.id}-${dateStr}`;
                  
                  return (
                    <Popover 
                      key={idx}
                      open={selectedCell?.employeeId === employee.id && selectedCell?.date === dateStr}
                      onOpenChange={(open) => {
                        if (open) {
                          setSelectedCell({ employeeId: employee.id!, date: dateStr });
                        } else {
                          setSelectedCell(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div 
                          className={cn(
                            'p-2 border-r min-h-20 cursor-pointer transition-colors',
                            isWeekend && 'bg-gray-50/50',
                            'hover:bg-teal-50/30',
                            dayShifts.length === 0 && 'border-dashed'
                          )}
                        >
                          <div className="space-y-1">
                            {dayShifts.map(shift => renderShiftCard(shift))}
                            {dayShifts.length === 0 && (
                              <div className="text-center py-4 text-gray-300 hover:text-[#14ad9f]">
                                <Plus className="h-4 w-4 mx-auto" />
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 px-2 py-1">Arbeitseinsatz hinzufügen:</div>
                          {Object.entries(SHIFT_TYPES).map(([key, type]) => (
                            <button
                              key={key}
                              onClick={() => handleQuickShiftCreate(employee.id!, dateStr, key as keyof typeof SHIFT_TYPES)}
                              className={cn(
                                'w-full px-2 py-1.5 text-left text-sm rounded flex items-center gap-2 hover:bg-gray-100',
                                type.text
                              )}
                            >
                              <type.icon className="h-4 w-4" />
                              <span>{type.name}</span>
                              {type.time && <span className="text-xs text-gray-400 ml-auto">{type.time}</span>}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}

                {/* Wochenstunden */}
                <div className="p-3 flex items-center justify-center">
                  <Badge variant="outline" className="text-lg font-bold">
                    {Math.round(weeklyHoursByEmployee[employee.id!] || 0)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Betriebskennzahlen */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Betriebskennzahlen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[200px_repeat(7,1fr)_80px] gap-0">
            {/* Kostenlimit */}
            <div className="p-2 text-sm text-gray-500">Kostenlimit</div>
            {dailyStats.map((stat, idx) => (
              <div key={idx} className="p-2 text-center">
                <div className="font-medium">{stat.hours}</div>
                <div className="h-1 bg-gray-200 rounded mt-1">
                  <div 
                    className="h-1 bg-[#14ad9f] rounded" 
                    style={{ width: `${Math.min(100, (stat.hours / 50) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="p-2 text-center font-bold">
              {Math.round(dailyStats.reduce((sum, s) => sum + s.hours, 0))} h
            </div>

            {/* Produktivität */}
            <div className="p-2 text-sm text-gray-500">Produktivität</div>
            {dailyStats.map((stat, idx) => (
              <div key={idx} className="p-2 text-center">
                <div className="h-4 bg-gray-100 rounded flex items-end">
                  <div 
                    className="w-full bg-linear-to-t from-[#14ad9f] to-teal-300 rounded" 
                    style={{ height: `${Math.min(100, (stat.employees / activeEmployees.length) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="p-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
