'use client';

/**
 * Gantt-Ansicht Seite
 * 
 * Features:
 * - Interaktives Gantt-Diagramm
 * - Critical Path Visualisierung
 * - Task-Details Sidebar
 * - Projekt-Auswahl
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Download,
  Upload,
  Filter,
  Search,
  X,
  Save,
  Trash2,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import { 
  ProjectService, 
  Project, 
  ProjectTask, 
  TaskDependency,
} from '@/services/ProjectService';

// Dynamic import für Gantt (SSR vermeiden)
const GanttChart = dynamic(
  () => import('@/components/projects/GanttChart').then(mod => mod.GanttChart),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
        <p className="text-gray-500">Gantt-Diagramm wird geladen...</p>
      </div>
    ),
  }
);

// ============================================
// TASK DETAIL SIDEBAR
// ============================================

interface TaskDetailSidebarProps {
  task: ProjectTask | null;
  project: Project;
  onClose: () => void;
  onSave: (updates: Partial<ProjectTask>) => void;
  onDelete: (taskId: string) => void;
  onAddDependency: (taskId: string, dependency: TaskDependency) => void;
}

const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  task,
  project,
  onClose,
  onSave,
  onDelete,
  onAddDependency,
}) => {
  const [editedTask, setEditedTask] = useState<Partial<ProjectTask>>({});
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  }, [task]);

  if (!task) return null;

  const availablePredecessors = project.tasks.filter(t => 
    t.id !== task.id && !task.dependencies.some(d => d.taskId === t.id)
  );

  const handleSave = () => {
    onSave(editedTask);
  };

  const handleAddDependency = (predecessorId: string) => {
    onAddDependency(task.id, {
      taskId: predecessorId,
      type: 'FS',
      lag: 0,
    });
    setShowDependencyPicker(false);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Aufgabendetails</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={editedTask.name || ''}
            onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
          />
        </div>

        {/* Beschreibung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beschreibung
          </label>
          <textarea
            value={editedTask.description || ''}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none resize-none"
          />
        </div>

        {/* Datum */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Startdatum
            </label>
            <input
              type="date"
              value={editedTask.startDate ? new Date(editedTask.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditedTask({ ...editedTask, startDate: new Date(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enddatum
            </label>
            <input
              type="date"
              value={editedTask.endDate ? new Date(editedTask.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditedTask({ ...editedTask, endDate: new Date(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
            />
          </div>
        </div>

        {/* Fortschritt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fortschritt: {editedTask.progress || 0}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={editedTask.progress || 0}
            onChange={(e) => setEditedTask({ ...editedTask, progress: parseInt(e.target.value) })}
            className="w-full accent-[#14ad9f]"
          />
        </div>

        {/* Priorität */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priorität
          </label>
          <select
            value={editedTask.priority || 'medium'}
            onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as ProjectTask['priority'] })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
          >
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="urgent">Dringend</option>
          </select>
        </div>

        {/* Critical Path Info */}
        {task.isCritical && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Kritischer Pfad</span>
            </div>
            <p className="text-sm text-red-600">
              Diese Aufgabe hat keinen Zeitpuffer. Eine Verzögerung verschiebt das Projektende.
            </p>
          </div>
        )}

        {/* Slack Info */}
        {task.slack !== undefined && task.slack > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Zeitpuffer: {task.slack} Tage</span>
            </div>
            <p className="text-sm text-green-600">
              Diese Aufgabe kann um bis zu {task.slack} Arbeitstage verzögert werden, ohne das Projektende zu beeinflussen.
            </p>
          </div>
        )}

        {/* Abhängigkeiten */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Abhängigkeiten (Vorgänger)
            </label>
            <button
              onClick={() => setShowDependencyPicker(true)}
              className="text-sm text-[#14ad9f] hover:text-teal-700 font-medium"
            >
              + Hinzufügen
            </button>
          </div>
          
          {task.dependencies.length > 0 ? (
            <div className="space-y-2">
              {task.dependencies.map(dep => {
                const predecessor = project.tasks.find(t => t.id === dep.taskId);
                return (
                  <div key={dep.taskId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Link2 className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-sm">{predecessor?.name || 'Unbekannt'}</span>
                    <span className="text-xs text-gray-500">{dep.type}</span>
                    {dep.lag !== 0 && (
                      <span className="text-xs text-gray-500">+{dep.lag}d</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Vorgänger definiert</p>
          )}

          {/* Dependency Picker */}
          {showDependencyPicker && availablePredecessors.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Vorgänger auswählen</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availablePredecessors.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleAddDependency(t.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-[#14ad9f] text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Speichern
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function GanttPage() {
  const params = useParams();
  const companyId = params.uid as string;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Projekte laden
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const loadedProjects = await ProjectService.getProjects(companyId);
        setProjects(loadedProjects);
        
        if (loadedProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(loadedProjects[0].id);
        }
      } catch (err) {
        setError('Projekte konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [companyId, selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Task Update Handler
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<ProjectTask>) => {
    if (!selectedProjectId) return;
    
    try {
      await ProjectService.updateTask(companyId, selectedProjectId, taskId, updates);
      
      // Lokal aktualisieren
      setProjects(prev => prev.map(p => {
        if (p.id !== selectedProjectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
        };
      }));
    } catch (err) {
      setError('Aufgabe konnte nicht aktualisiert werden');
    }
  }, [companyId, selectedProjectId]);

  // Task Delete Handler
  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!selectedProjectId || !confirm('Aufgabe wirklich löschen?')) return;
    
    try {
      await ProjectService.deleteTask(companyId, selectedProjectId, taskId);
      
      // Lokal entfernen
      setProjects(prev => prev.map(p => {
        if (p.id !== selectedProjectId) return p;
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId),
        };
      }));
      
      setSelectedTask(null);
    } catch (err) {
      setError('Aufgabe konnte nicht gelöscht werden');
    }
  }, [companyId, selectedProjectId]);

  // Dependency hinzufügen
  const handleAddDependency = useCallback(async (taskId: string, dependency: TaskDependency) => {
    if (!selectedProjectId) return;
    
    try {
      await ProjectService.addDependency(companyId, selectedProjectId, taskId, dependency);
      
      // Lokal aktualisieren
      setProjects(prev => prev.map(p => {
        if (p.id !== selectedProjectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== taskId) return t;
            return { ...t, dependencies: [...t.dependencies, dependency] };
          }),
        };
      }));
      
      // Selected Task aktualisieren
      if (selectedTask?.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          dependencies: [...selectedTask.dependencies, dependency],
        });
      }
    } catch (err) {
      setError('Abhängigkeit konnte nicht hinzugefügt werden');
    }
  }, [companyId, selectedProjectId, selectedTask]);

  // Neue Task erstellen
  const handleCreateTask = useCallback(async () => {
    if (!selectedProjectId) return;
    
    try {
      const taskId = await ProjectService.addTask(companyId, selectedProjectId, {
        name: 'Neue Aufgabe',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 5,
      }, 'current-user-id'); // TODO: echte User ID

      // Projekt neu laden
      const updatedProject = await ProjectService.getProject(companyId, selectedProjectId);
      if (updatedProject) {
        setProjects(prev => prev.map(p => p.id === selectedProjectId ? updatedProject : p));
        
        const newTask = updatedProject.tasks.find(t => t.id === taskId);
        if (newTask) {
          setSelectedTask(newTask);
        }
      }
    } catch (err) {
      setError('Aufgabe konnte nicht erstellt werden');
    }
  }, [companyId, selectedProjectId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Fehler</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gantt-Diagramm</h1>
          <p className="text-gray-500 mt-1">
            Projektplanung mit Critical Path Analyse
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Projekt-Auswahl */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Critical Path Toggle */}
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
            />
            <span className="text-sm font-medium text-gray-700">Kritischer Pfad</span>
          </label>

          {/* Neue Aufgabe */}
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 bg-[#14ad9f] text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Neue Aufgabe
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      {selectedProject ? (
        <GanttChart
          project={selectedProject}
          onTaskUpdate={handleTaskUpdate}
          onTaskSelect={setSelectedTask}
          showCriticalPath={showCriticalPath}
          showResources={false}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Kein Projekt ausgewählt
          </h3>
          <p className="text-gray-500 mb-4">
            Wählen Sie ein Projekt aus oder erstellen Sie ein neues.
          </p>
          <Link
            href={`/dashboard/company/${companyId}/projects/new`}
            className="inline-block bg-[#14ad9f] text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Neues Projekt erstellen
          </Link>
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selectedTask && selectedProject && (
        <TaskDetailSidebar
          task={selectedTask}
          project={selectedProject}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskUpdate.bind(null, selectedTask.id)}
          onDelete={handleTaskDelete}
          onAddDependency={handleAddDependency}
        />
      )}
    </div>
  );
}
