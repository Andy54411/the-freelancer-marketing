'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Folder,
  FileText,
  X,
  ChevronDown,
  ArrowRight,
  Users,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import { ProjectService, type Project, type ProjectTask } from '@/services/ProjectService';

// Task-Status Optionen wie bei das-programm.io
const TASK_STATUSES = [
  { value: 'offen', label: 'offen', color: 'bg-gray-100 text-gray-700' },
  { value: 'angenommen', label: 'angenommen', color: 'bg-blue-100 text-blue-700' },
  { value: 'abgelehnt', label: 'abgelehnt', color: 'bg-red-100 text-red-700' },
  { value: 'warten', label: 'warten', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'abgeschlossen', label: 'abgeschlossen', color: 'bg-green-100 text-green-700' },
];

interface ExtendedTask extends ProjectTask {
  projectId: string;
  projectName: string;
  projectNumber: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderName?: string;
  location?: string;
  personHours?: number;
  taskStatus?: string;
}

export default function ProjectTasksPage() {
  const params = useParams();
  const uid = params.uid as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const projectList = await ProjectService.getProjects(uid);
      setProjects(projectList);

      // Alle Tasks aus allen Projekten extrahieren
      const tasks: ExtendedTask[] = [];
      projectList.forEach((project, projectIndex) => {
        const projectNumber = `P-${project.createdAt.getFullYear()}-${(projectIndex + 1).toString().padStart(3, '0')}`;
        
        project.tasks.forEach((task) => {
          tasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
            projectNumber,
            taskStatus: 'offen',
          });
        });
      });

      setAllTasks(tasks);
    } catch {
      // Fehler silent ignorieren
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tasks filtern
  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch =
      !searchTerm ||
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.taskStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Task-Nummer generieren
  const getTaskNumber = (task: ExtendedTask, index: number): string => {
    const year = task.createdAt.getFullYear();
    return `PA-${year}-${(index + 1).toString().padStart(0, '0')}`;
  };

  // Modal öffnen
  const openTaskModal = (task?: ExtendedTask) => {
    if (task) {
      setSelectedTask(task);
    } else {
      // Neue Aufgabe
      setSelectedTask({
        id: '',
        name: '',
        type: 'task',
        startDate: new Date(),
        endDate: new Date(),
        duration: 1,
        progress: 0,
        order: 0,
        dependencies: [],
        assignedTo: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        projectId: '',
        projectName: '',
        projectNumber: '',
        taskStatus: 'offen',
      });
    }
    setShowModal(true);
  };

  // Task speichern
  const saveTask = async () => {
    if (!selectedTask) return;

    try {
      if (selectedTask.id && selectedTask.projectId) {
        // Bestehenden Task aktualisieren
        await ProjectService.updateTask(uid, selectedTask.projectId, selectedTask.id, {
          name: selectedTask.name,
          description: selectedTask.description,
          startDate: selectedTask.startDate,
          endDate: selectedTask.endDate,
          progress: selectedTask.progress,
          assignedTo: selectedTask.assignedTo,
        });
      } else if (selectedTask.projectId) {
        // Neuen Task erstellen
        await ProjectService.addTask(uid, selectedTask.projectId, {
          name: selectedTask.name,
          description: selectedTask.description,
          startDate: selectedTask.startDate,
          endDate: selectedTask.endDate,
          assignedTo: selectedTask.assignedTo,
        }, uid);
      }

      setShowModal(false);
      loadData();
    } catch {
      // Fehler silent ignorieren
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-[#14ad9f]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projekt-Aufgaben</h1>
            <p className="text-sm text-gray-500">{allTasks.length} Aufgaben in {projects.length} Projekten</p>
          </div>
        </div>

        <button
          onClick={() => openTaskModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Aufgabe
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Aufgaben oder Projekte suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
          >
            <option value="all">Alle Status</option>
            {TASK_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Weitere Filter
          </button>
        </div>
      </div>

      {/* Task-Liste */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nummer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Bezeichnung
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Projekt
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Von
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Bis
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fortschritt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <CheckSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Keine Aufgaben gefunden
                    </h3>
                    <p className="text-gray-500">
                      Erstellen Sie Ihre erste Aufgabe oder ändern Sie die Filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, index) => {
                const statusConfig = TASK_STATUSES.find((s) => s.value === task.taskStatus);

                return (
                  <tr
                    key={`${task.projectId}-${task.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openTaskModal(task)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#14ad9f] font-medium">
                        {getTaskNumber(task, index)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{task.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/company/${uid}/projects/${task.projectId}`}
                        className="text-sm text-[#14ad9f] hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Folder className="w-3 h-3" />
                        {task.projectName} ({task.projectNumber})
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusConfig?.label || task.taskStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(task.startDate, 'dd.MM.yyyy', { locale: de })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(task.endDate, 'dd.MM.yyyy', { locale: de })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#14ad9f]"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Modal - wie bei das-programm.io */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Projekt Aufgabe</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Kundensuche */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Kundensuche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Kundensuche"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Aufgaben-Nummer (readonly) */}
              {selectedTask.id && (
                <div className="text-lg font-semibold text-gray-900">
                  {getTaskNumber(selectedTask, allTasks.indexOf(selectedTask))}
                </div>
              )}

              {/* Bezeichnung & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Bezeichnung</label>
                  <input
                    type="text"
                    value={selectedTask.name}
                    onChange={(e) =>
                      setSelectedTask({ ...selectedTask, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Status</label>
                  <select
                    value={selectedTask.taskStatus || 'offen'}
                    onChange={(e) =>
                      setSelectedTask({ ...selectedTask, taskStatus: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Projekt & Auftrag */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Projekt</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTask.projectId}
                      onChange={(e) => {
                        const project = projects.find((p) => p.id === e.target.value);
                        if (project) {
                          const projectIndex = projects.indexOf(project);
                          setSelectedTask({
                            ...selectedTask,
                            projectId: project.id,
                            projectName: project.name,
                            projectNumber: `P-${project.createdAt.getFullYear()}-${(projectIndex + 1).toString().padStart(3, '0')}`,
                          });
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                    >
                      <option value="">Projekt wählen...</option>
                      {projects.map((project, index) => (
                        <option key={project.id} value={project.id}>
                          {project.name} (P-{project.createdAt.getFullYear()}-{(index + 1).toString().padStart(3, '0')})
                        </option>
                      ))}
                    </select>
                    {selectedTask.projectId && (
                      <Link
                        href={`/dashboard/company/${uid}/projects/${selectedTask.projectId}`}
                        className="px-3 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Auftrag</label>
                  <div className="flex gap-2">
                    <select className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none">
                      <option value="">Auftrag wählen...</option>
                    </select>
                    <button className="px-3 py-2 bg-gray-100 text-gray-400 rounded-lg">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Datum von/bis */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">von</label>
                  <input
                    type="datetime-local"
                    value={format(selectedTask.startDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        startDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">bis</label>
                  <input
                    type="datetime-local"
                    value={format(selectedTask.endDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        endDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Mitarbeiter */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Mitarbeiter</label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg min-h-[42px]">
                  {/* Tags für zugewiesene Mitarbeiter */}
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                    Gregor Müller
                    <button className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                  <button className="px-2 py-1 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
                    <Plus className="w-3 h-3" />
                    Hinzufügen
                  </button>
                </div>
              </div>

              {/* Ort & Fällig */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Ort</label>
                  <input
                    type="text"
                    value={selectedTask.location || ''}
                    onChange={(e) =>
                      setSelectedTask({ ...selectedTask, location: e.target.value })
                    }
                    placeholder="Arbeitsort"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">fällig</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Beschreibung</label>
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none resize-none"
                  placeholder="Aufgabenbeschreibung..."
                />
              </div>

              {/* Personenstunden & Fortschritt */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Personenstunden</label>
                  <input
                    type="number"
                    value={selectedTask.personHours || selectedTask.duration * 8}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        personHours: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Fortschritt</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        progress: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Vorgänger (Dependencies) */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Vorgänger</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none">
                  <option value="">Keine Abhängigkeit</option>
                  {allTasks
                    .filter((t) => t.id !== selectedTask.id && t.projectId === selectedTask.projectId)
                    .map((task, idx) => (
                      <option key={task.id} value={task.id}>
                        {getTaskNumber(task, idx)} - {task.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={saveTask}
                className="px-6 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
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
