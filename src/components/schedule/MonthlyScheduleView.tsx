'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Employee, Shift } from '@/services/personalService';

interface MonthlyScheduleViewProps {
  employees: Employee[];
  shifts: Shift[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onShiftClick: (shift: Shift) => void;
  onCreateShift: () => void;
}

export function MonthlyScheduleView({
  employees,
  shifts,
  currentDate,
  onDateChange,
  onShiftClick,
  onCreateShift,
}: MonthlyScheduleViewProps) {
  // Helper Funktionen für den Kalender
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean; day: number }> = [];

    // Vorherige Monatstage (grau dargestellt)
    const prevMonth = new Date(year, month - 1, 0);
    const daysFromPrevMonth = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const day = prevMonth.getDate() - i + 1;
      days.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        day: day,
      });
    }

    // Aktuelle Monatstage
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
        day: day,
      });
    }

    // Nächste Monatstage (um das Grid zu füllen)
    const remainingDays = 42 - days.length; // 6 Wochen * 7 Tage
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        day: day,
      });
    }

    return days;
  };

  const getShiftsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ABSENT':
        return 'bg-red-100 text-red-800 border-red-200 border-l-4 border-l-red-500';
      case 'SICK':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 border-l-4 border-l-yellow-500';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ABSENT':
        return '🏖️'; // Urlaub
      case 'SICK':
        return '🤒'; // Krank
      case 'CONFIRMED':
        return '✅';
      case 'PLANNED':
        return '📅';
      default:
        return '';
    }
  };

  const getShiftTypeColor = (startTime: string) => {
    switch (startTime) {
      case '06:00':
        return 'border-l-orange-500'; // Frühschicht
      case '14:00':
        return 'border-l-purple-500'; // Spätschicht
      case '22:00':
        return 'border-l-indigo-500'; // Nachtschicht
      case '10:00':
        return 'border-l-blue-500'; // Mittelschicht
      default:
        return 'border-l-[#14ad9f]';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const monthDays = getMonthDays(currentDate);
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="space-y-4">
      {/* Monats-Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('de-DE', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={() => onDateChange(new Date())} variant="outline" size="sm">
          Heute
        </Button>
      </div>

      {/* Kalender Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Wochentage Header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map(day => (
              <div
                key={day}
                className="p-3 text-center font-medium text-gray-600 border-r last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Kalender-Tage */}
          <div className="grid grid-cols-7">
            {monthDays.map((dayInfo, index) => {
              const dayShifts = getShiftsForDate(dayInfo.date);
              const isToday = dayInfo.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-b last:border-r-0 p-2 ${
                    !dayInfo.isCurrentMonth ? 'bg-gray-50' : ''
                  }`}
                >
                  {/* Tag-Nummer */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? 'bg-[#14ad9f] text-white rounded-full w-6 h-6 flex items-center justify-center'
                          : dayInfo.isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      }`}
                    >
                      {dayInfo.day}
                    </span>

                    {/* Schicht hinzufügen Button */}
                    {dayInfo.isCurrentMonth && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#14ad9f] hover:text-white"
                        onClick={onCreateShift}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Schichten für diesen Tag */}
                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map(shift => {
                      const employee = employees.find(emp => emp.id === shift.employeeId);
                      return (
                        <div
                          key={shift.id}
                          className={`text-xs p-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(shift.status)} ${getShiftTypeColor(shift.startTime)}`}
                          onClick={() => onShiftClick(shift)}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            <span>{getStatusIcon(shift.status)}</span>
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt'}
                          </div>
                          <div className="text-gray-600 truncate">
                            {shift.status === 'ABSENT' || shift.status === 'SICK'
                              ? shift.department || 'Abwesend'
                              : `${shift.startTime} - ${shift.endTime}`}
                          </div>
                          {shift.notes && (
                            <div className="text-gray-500 truncate text-xs">{shift.notes}</div>
                          )}
                        </div>
                      );
                    })}

                    {/* Weitere Schichten Indikator */}
                    {dayShifts.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{dayShifts.length - 3} weitere
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monats-Statistiken */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Schichten diesen Monat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#14ad9f]">
              {
                shifts.filter(shift => {
                  const shiftDate = new Date(shift.date);
                  return (
                    shiftDate.getMonth() === currentDate.getMonth() &&
                    shiftDate.getFullYear() === currentDate.getFullYear()
                  );
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Geplante Stunden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#14ad9f]">
              {shifts
                .filter(shift => {
                  const shiftDate = new Date(shift.date);
                  return (
                    shiftDate.getMonth() === currentDate.getMonth() &&
                    shiftDate.getFullYear() === currentDate.getFullYear()
                  );
                })
                .reduce((total, shift) => {
                  const start = new Date(`2000-01-01T${shift.startTime}`);
                  const end = new Date(`2000-01-01T${shift.endTime}`);
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }, 0)
                .toFixed(1)}
              h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Aktive Mitarbeiter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#14ad9f]">
              {employees.filter(emp => emp.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
