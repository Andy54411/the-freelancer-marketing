'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
  Clock,
  Grid3X3,
  CalendarDays,
  CalendarRange,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, getISOWeek, getYear, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import { ProjectService, type Project, type ProjectTask } from '@/services/ProjectService';

interface Employee {
  id: string;
  name: string;
  role?: string;
  color: string;
}

interface Assignment {
  id: string;
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  date: Date;
  hours: number;
  color: string;
}

// Mock-Mitarbeiter (später aus Firestore)
const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp1', name: 'Gregor Müller', role: 'Meister', color: '#14ad9f' },
  { id: 'emp2', name: 'Peter Kruder', role: 'Geselle', color: '#3b82f6' },
  { id: 'emp3', name: 'Richard Dorfmeister', role: 'Geselle', color: '#f59e0b' },
  { id: 'emp4', name: 'Sade Adu', role: 'Lehrling', color: '#8b5cf6' },
];

export default function SchedulingPage() {
  const params = useParams();
  const uid = params.uid as string;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [zoomLevel, setZoomLevel] = useState(50);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekNumber = getISOWeek(currentDate);
  const year = getYear(currentDate);

  // Wochentage generieren
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const loadData = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const projectList = await ProjectService.getProjects(uid);
      setProjects(projectList);

      // Assignments aus Tasks generieren
      const newAssignments: Assignment[] = [];
      projectList.forEach((project) => {
        project.tasks.forEach((task) => {
          task.assignedTo.forEach((employeeId) => {
            // Für jeden Tag der Task
            let current = new Date(task.startDate);
            while (current <= task.endDate) {
              newAssignments.push({
                id: `${task.id}-${employeeId}-${current.getTime()}`,
                taskId: task.id,
                taskName: task.name,
                projectId: project.id,
                projectName: project.name,
                employeeId,
                date: new Date(current),
                hours: 8, // Standard 8h pro Tag
                color: project.color,
              });
              current = addDays(current, 1);
            }
          });
        });
      });

      setAssignments(newAssignments);
    } catch {
      // Fehler silent ignorieren
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Assignments für einen Mitarbeiter an einem Tag
  const getAssignmentsForCell = (employeeId: string, date: Date): Assignment[] => {
    return assignments.filter(
      (a) => a.employeeId === employeeId && isSameDay(a.date, date)
    );
  };

  // Nicht zugewiesene Aufgaben für einen Tag
  const getUnassignedTasksForDay = (date: Date): { task: ProjectTask; project: Project }[] => {
    const result: { task: ProjectTask; project: Project }[] = [];
    
    projects.forEach((project) => {
      project.tasks.forEach((task) => {
        if (task.assignedTo.length === 0) {
          if (date >= task.startDate && date <= task.endDate) {
            result.push({ task, project });
          }
        }
      });
    });
    
    return result;
  };

  // Navigation
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToThisWeek = () => setCurrentDate(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#14ad9f]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Einsatzplanung</h1>
          </div>
        </div>

        {/* Ansicht-Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">Kalender</span>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <CalendarDays className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 border border-gray-200 rounded-lg bg-[#14ad9f] text-white">
            <Grid3X3 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <span className="text-sm text-gray-500 mr-2">Ressourcen</span>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <CalendarDays className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <CalendarRange className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Grid3X3 className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Calendar className="w-4 h-4 text-gray-600" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <button className="p-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kalenderwoche & Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Kalenderwoche {weekNumber} - {year}
        </h2>

        <div className="flex items-center gap-4">
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="20"
              max="100"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-24"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToThisWeek}
              className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
            >
              Diese Woche
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kundensuche"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
          />
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Projekt suchen"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
          />
        </div>
      </div>

      {/* Kalender-Grid */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="w-48 p-3 text-left text-sm font-medium text-gray-500 border-r border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Mitarbeiter
                </div>
              </th>
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <th
                    key={index}
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                      isWeekend ? 'bg-gray-50' : ''
                    }`}
                    style={{ minWidth: `${zoomLevel + 60}px` }}
                  >
                    <div className={`text-sm ${isToday ? 'text-[#14ad9f] font-bold' : 'text-gray-500'}`}>
                      {format(day, 'dd.MM.yyyy', { locale: de })}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-[#14ad9f]' : 'text-gray-400'}`}>
                      {format(day, 'EEEE', { locale: de })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Nicht zugewiesene Zeile */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="p-3 border-r border-gray-200">
                <span className="text-sm text-gray-500">keine Zuweisung</span>
              </td>
              {weekDays.map((day, dayIndex) => {
                const unassigned = getUnassignedTasksForDay(day);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <td
                    key={dayIndex}
                    className={`p-2 border-r border-gray-200 last:border-r-0 align-top ${
                      isWeekend ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      {unassigned.slice(0, 3).map(({ task, project }) => (
                        <div
                          key={task.id}
                          className="px-2 py-1 rounded text-xs text-white truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: project.color }}
                          title={`${task.name} (${project.name})`}
                        >
                          {task.name}
                        </div>
                      ))}
                      {unassigned.length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{unassigned.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Mitarbeiter-Zeilen */}
            {MOCK_EMPLOYEES.map((employee) => (
              <tr key={employee.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                <td className="p-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: employee.color }}
                    >
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      {employee.role && (
                        <div className="text-xs text-gray-500">{employee.role}</div>
                      )}
                    </div>
                  </div>
                </td>
                {weekDays.map((day, dayIndex) => {
                  const cellAssignments = getAssignmentsForCell(employee.id, day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <td
                      key={dayIndex}
                      className={`p-2 border-r border-gray-200 last:border-r-0 align-top ${
                        isWeekend ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="space-y-1 min-h-[60px]">
                        {cellAssignments.map((assignment) => (
                          <Link
                            key={assignment.id}
                            href={`/dashboard/company/${uid}/projects/${assignment.projectId}`}
                            className="block px-2 py-1.5 rounded text-xs text-white truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: assignment.color }}
                            title={`${assignment.taskName} - ${assignment.projectName}`}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{assignment.taskName}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
