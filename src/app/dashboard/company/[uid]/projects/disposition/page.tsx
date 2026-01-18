'use client';

/**
 * Disposition - wie bei das-programm.io
 * 
 * Features:
 * - Zeitskala oben mit Kalenderwochen
 * - Projekte als farbige Balken auf Timeline
 * - Ressourcen-Zeilen unten mit Kapazitäts-Anzeige (Blau = Verfügbar, Rot = Überbucht)
 * - Zoom-Slider
 * - Modal für Projektdetails und Ressourcenbedarf
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  ZoomIn,
  ZoomOut,
  X,
  Trash2,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  getISOWeek,
  differenceInDays,
  format,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ProjectService,
  Project,
} from '@/services/ProjectService';

// Ressourcen-Typen (Lohngruppen)
const RESOURCE_TYPES = [
  { id: 'meister', name: 'Meister', capacity: 40 },
  { id: 'geselle', name: 'Geselle', capacity: 40 },
  { id: 'lehrling', name: 'Lehrling', capacity: 40 },
  { id: 'azubi', name: 'Azubi', capacity: 40 },
];

// Ressourcenbedarf Interface
interface ResourceRequirement {
  id: string;
  description: string;
  resourceType: string;
  hours: number;
}

interface ProjectWithRequirements extends Project {
  resourceRequirements?: ResourceRequirement[];
}

export default function DispositionPage() {
  const params = useParams();
  const companyId = params.uid as string;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<ProjectWithRequirements[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(50);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRequirements | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Zeitraum berechnen (3 Monate Ansicht)
  const viewStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
  const viewEnd = useMemo(() => endOfMonth(addMonths(currentDate, 2)), [currentDate]);
  const totalDays = useMemo(() => differenceInDays(viewEnd, viewStart) + 1, [viewStart, viewEnd]);

  // Kalenderwochen generieren
  const calendarWeeks = useMemo(() => {
    const weeks: { weekNum: number; month: string; startDate: Date; days: Date[] }[] = [];
    let current = startOfWeek(viewStart, { weekStartsOn: 1 });

    while (current < viewEnd) {
      const weekNum = getISOWeek(current);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(current, i));
      }
      weeks.push({
        weekNum,
        month: format(current, 'MMMM yyyy', { locale: de }),
        startDate: current,
        days,
      });
      current = addDays(current, 7);
    }

    return weeks;
  }, [viewStart, viewEnd]);

  // Projekte laden
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const loadedProjects = await ProjectService.getProjects(companyId);
      setProjects(loadedProjects);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Projekt-Position und -Breite berechnen
  const getProjectStyle = (project: Project) => {
    const projectStart = project.startDate;
    const projectEnd = project.endDate;

    const start = projectStart < viewStart ? viewStart : projectStart;
    const end = projectEnd > viewEnd ? viewEnd : projectEnd;

    const startOffset = differenceInDays(start, viewStart);
    const duration = differenceInDays(end, start) + 1;

    const dayWidth = (zoomLevel / 50) * 30;

    return {
      left: `${startOffset * dayWidth}px`,
      width: `${duration * dayWidth}px`,
    };
  };

  // Ressourcen-Auslastung für eine Woche berechnen
  const getResourceUtilization = (resourceType: string, week: { days: Date[] }) => {
    let allocated = 0;
    const capacity = RESOURCE_TYPES.find((r) => r.id === resourceType)?.capacity || 40;

    projects.forEach((project) => {
      project.resourceRequirements?.forEach((req) => {
        if (req.resourceType === resourceType) {
          const isActive = week.days.some((day) =>
            isWithinInterval(day, { start: project.startDate, end: project.endDate })
          );
          if (isActive) {
            allocated += req.hours / 5;
          }
        }
      });
    });

    return {
      allocated,
      capacity,
      percentage: Math.min((allocated / capacity) * 100, 100),
      isOverbooked: allocated > capacity,
    };
  };

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const openProjectModal = (project: ProjectWithRequirements) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const addResourceRequirement = () => {
    if (!selectedProject) return;

    const newReq: ResourceRequirement = {
      id: `req_${Date.now()}`,
      description: '',
      resourceType: 'geselle',
      hours: 8,
    };

    setSelectedProject({
      ...selectedProject,
      resourceRequirements: [...(selectedProject.resourceRequirements || []), newReq],
    });
  };

  const removeResourceRequirement = (reqId: string) => {
    if (!selectedProject) return;

    setSelectedProject({
      ...selectedProject,
      resourceRequirements: selectedProject.resourceRequirements?.filter((r) => r.id !== reqId),
    });
  };

  const saveProject = async () => {
    if (!selectedProject) return;

    try {
      await ProjectService.updateProject(companyId, selectedProject.id, {
        ...selectedProject,
      } as Partial<Project>);

      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProject.id ? selectedProject : p))
      );

      setShowProjectModal(false);
    } catch {
      // Error handling
    }
  };

  const dayWidth = (zoomLevel / 50) * 30;

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#14ad9f]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Disposition</h1>
        </div>

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
              className="w-32"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm font-medium text-gray-700">
              {format(currentDate, 'MMMM yyyy', { locale: de })}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Disposition Grid */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto flex-1"
        >
          <div style={{ minWidth: `${totalDays * dayWidth + 150}px` }}>
            {/* Monat/KW Header */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
              <div className="w-36 shrink-0 border-r border-gray-200" />
              {calendarWeeks.map((week, idx) => (
                <div
                  key={idx}
                  className="text-center border-r border-gray-100 text-xs"
                  style={{ width: `${7 * dayWidth}px` }}
                >
                  <div className="py-1 bg-gray-50 text-gray-500 font-medium">
                    {idx === 0 || week.month !== calendarWeeks[idx - 1]?.month
                      ? week.month
                      : ''}
                  </div>
                  <div className="py-1 text-gray-600 font-medium">{week.weekNum}</div>
                </div>
              ))}
            </div>

            {/* Tage Header */}
            <div className="flex border-b border-gray-200 sticky top-[52px] bg-white z-20">
              <div className="w-36 shrink-0 border-r border-gray-200" />
              {calendarWeeks.map((week) =>
                week.days.map((day, dayIdx) => {
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={day.getTime()}
                      className={`text-center text-xs py-1 border-r border-gray-100 ${
                        isWeekend ? 'bg-gray-50' : ''
                      } ${isToday ? 'bg-[#14ad9f]/10' : ''}`}
                      style={{ width: `${dayWidth}px` }}
                    >
                      <span className={isToday ? 'font-bold text-[#14ad9f]' : 'text-gray-400'}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Projekte */}
            <div className="relative" style={{ minHeight: `${(projects.length + 1) * 36}px` }}>
              {projects.map((project, projectIdx) => {
                const style = getProjectStyle(project);
                const projectNumber = `P-${project.createdAt.getFullYear()}-${(projectIdx + 1).toString().padStart(3, '0')}`;

                return (
                  <div
                    key={project.id}
                    className="absolute h-8 flex items-center"
                    style={{
                      top: `${projectIdx * 36 + 4}px`,
                      ...style,
                    }}
                  >
                    <div
                      className="h-6 rounded px-2 text-white text-xs font-medium flex items-center truncate cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                      style={{
                        backgroundColor: project.color || '#3b82f6',
                        width: '100%',
                      }}
                      onClick={() => openProjectModal(project)}
                      title={`${project.name} (${projectNumber})`}
                    >
                      {project.name} {projectNumber}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ressourcen-Zeilen */}
            <div className="border-t-2 border-gray-300 mt-4">
              {RESOURCE_TYPES.map((resourceType) => (
                <div
                  key={resourceType.id}
                  className="flex border-b border-gray-100"
                >
                  <div className="w-36 shrink-0 border-r border-gray-200 p-2 bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">
                      {resourceType.name}
                    </span>
                  </div>

                  {calendarWeeks.map((week) => {
                    const util = getResourceUtilization(resourceType.id, week);

                    return (
                      <div
                        key={week.weekNum}
                        className="flex items-end p-1 border-r border-gray-100"
                        style={{ width: `${7 * dayWidth}px` }}
                      >
                        <div className="w-full h-8 flex gap-0.5">
                          <div
                            className="bg-blue-400 rounded-sm"
                            style={{
                              width: `${Math.min(50, 50 - (util.isOverbooked ? 0 : (50 - util.percentage / 2)))}%`,
                              height: '100%',
                            }}
                          />
                          {util.isOverbooked && (
                            <div
                              className="bg-red-400 rounded-sm"
                              style={{
                                width: `${Math.min(50, ((util.allocated - util.capacity) / util.capacity) * 50)}%`,
                                height: '100%',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projekt-Modal */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  P-{selectedProject.createdAt.getFullYear()}-{(projects.indexOf(selectedProject) + 1).toString().padStart(3, '0')}{' '}
                  {selectedProject.name}
                </h2>
              </div>
              <button
                onClick={() => setShowProjectModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Bezeichnung</label>
                  <input
                    type="text"
                    value={selectedProject.name}
                    onChange={(e) =>
                      setSelectedProject({ ...selectedProject, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Status</label>
                  <select
                    value={selectedProject.status}
                    onChange={(e) =>
                      setSelectedProject({
                        ...selectedProject,
                        status: e.target.value as Project['status'],
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  >
                    <option value="planning">Planung</option>
                    <option value="active">In Arbeit</option>
                    <option value="paused">Pausiert</option>
                    <option value="completed">Abgeschlossen</option>
                    <option value="cancelled">Abgebrochen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={format(selectedProject.startDate, 'yyyy-MM-dd')}
                    onChange={(e) =>
                      setSelectedProject({
                        ...selectedProject,
                        startDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Enddatum</label>
                  <input
                    type="date"
                    value={format(selectedProject.endDate, 'yyyy-MM-dd')}
                    onChange={(e) =>
                      setSelectedProject({
                        ...selectedProject,
                        endDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Ressourcenbedarf</h3>
                  <button
                    onClick={addResourceRequirement}
                    className="p-2 bg-[#14ad9f] text-white rounded-full hover:bg-teal-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-500">
                  <div className="col-span-5">Beschreibung</div>
                  <div className="col-span-4">Lohngruppen</div>
                  <div className="col-span-2">Personenstunden</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                  {(selectedProject.resourceRequirements || []).map((req) => (
                    <div key={req.id} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={req.description}
                          onChange={(e) => {
                            const updated = selectedProject.resourceRequirements?.map((r) =>
                              r.id === req.id ? { ...r, description: e.target.value } : r
                            );
                            setSelectedProject({
                              ...selectedProject,
                              resourceRequirements: updated,
                            });
                          }}
                          placeholder="z.B. Streichen"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-4">
                        <select
                          value={req.resourceType}
                          onChange={(e) => {
                            const updated = selectedProject.resourceRequirements?.map((r) =>
                              r.id === req.id ? { ...r, resourceType: e.target.value } : r
                            );
                            setSelectedProject({
                              ...selectedProject,
                              resourceRequirements: updated,
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                        >
                          {RESOURCE_TYPES.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={req.hours}
                          onChange={(e) => {
                            const updated = selectedProject.resourceRequirements?.map((r) =>
                              r.id === req.id ? { ...r, hours: parseInt(e.target.value) } : r
                            );
                            setSelectedProject({
                              ...selectedProject,
                              resourceRequirements: updated,
                            });
                          }}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeResourceRequirement(req.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!selectedProject.resourceRequirements ||
                    selectedProject.resourceRequirements.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      Noch kein Ressourcenbedarf definiert.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={saveProject}
                className="px-6 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
