'use client';

/**
 * GanttChart Komponente mit Critical Path Visualisierung
 * 
 * Features:
 * - Basis: gantt-task-react (MIT License)
 * - Critical Path Berechnung (eigene Implementierung)
 * - Resource Assignment Anzeige
 * - Interaktive Task-Bearbeitung
 * - Zoom-Levels (Tag/Woche/Monat)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Gantt, ViewMode, Task as GanttTaskType } from 'gantt-task-react';
// CSS wird via next.config.mjs transpiled oder als globale CSS importiert
import { 
  ProjectTask, 
  Project, 
  CriticalPathCalculator,
  ProjectService,
  GanttTask,
} from '@/services/ProjectService';
import { 
  AlertTriangle, 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  Users,
  ChevronDown,
  ChevronRight,
  Settings,
  Download,
  RefreshCw,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface GanttChartProps {
  project: Project;
  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;
  onTaskSelect?: (task: ProjectTask) => void;
  showCriticalPath?: boolean;
  showResources?: boolean;
  readOnly?: boolean;
}

type ZoomLevel = 'day' | 'week' | 'month';

// ============================================
// STYLES
// ============================================

const customStyles = `
  .gantt-task-critical .gantt_task_progress,
  .gantt-task-critical .gantt_task_line {
    background-color: #ef4444 !important;
    border-color: #dc2626 !important;
  }
  
  .gantt-task-critical .gantt_task_progress_wrapper {
    background-color: #fee2e2 !important;
  }
  
  .gantt-task-slack-low {
    border-left: 3px solid #f59e0b !important;
  }
  
  .gantt-task-slack-high {
    border-left: 3px solid #22c55e !important;
  }
  
  .critical-path-legend {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
`;

// ============================================
// COMPONENT
// ============================================

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onTaskUpdate,
  onTaskSelect,
  showCriticalPath = true,
  showResources = false,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [showTaskList, setShowTaskList] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Critical Path berechnen
  const tasksWithCriticalPath = useMemo(() => {
    if (!showCriticalPath || project.tasks.length === 0) {
      return project.tasks;
    }

    const calculator = new CriticalPathCalculator(
      [...project.tasks], // Kopie erstellen um Mutation zu vermeiden
      project.workingDays,
      project.hoursPerDay
    );
    
    return calculator.calculate();
  }, [project.tasks, project.workingDays, project.hoursPerDay, showCriticalPath]);

  // Konvertiere zu gantt-task-react Format
  const ganttTasks: GanttTaskType[] = useMemo(() => {
    return tasksWithCriticalPath.map(task => {
      const isSelected = selectedTask === task.id;
      const baseColor = task.isCritical ? '#ef4444' : (task.color || '#14ad9f');
      const progressColor = task.isCritical ? '#b91c1c' : '#0d8a7f';
      
      return {
        id: task.id,
        name: task.name,
        start: new Date(task.startDate),
        end: new Date(task.endDate),
        progress: task.progress,
        type: task.type as 'task' | 'milestone' | 'project',
        dependencies: task.dependencies.map(d => d.taskId),
        project: task.parentId,
        isDisabled: readOnly,
        styles: {
          backgroundColor: baseColor,
          backgroundSelectedColor: isSelected ? '#1e40af' : baseColor,
          progressColor: progressColor,
          progressSelectedColor: isSelected ? '#1e3a8a' : progressColor,
        },
      };
    });
  }, [tasksWithCriticalPath, selectedTask, readOnly]);

  // Statistiken
  const stats = useMemo(() => {
    const criticalTasks = tasksWithCriticalPath.filter(t => t.isCritical);
    const totalSlack = tasksWithCriticalPath.reduce((sum, t) => sum + (t.slack || 0), 0);
    const avgSlack = tasksWithCriticalPath.length > 0 
      ? totalSlack / tasksWithCriticalPath.length 
      : 0;
    
    const projectDuration = tasksWithCriticalPath.length > 0
      ? new CriticalPathCalculator(
          tasksWithCriticalPath,
          project.workingDays,
          project.hoursPerDay
        ).getProjectDuration()
      : 0;

    return {
      totalTasks: project.tasks.length,
      criticalTasks: criticalTasks.length,
      avgSlack: Math.round(avgSlack * 10) / 10,
      projectDuration,
      criticalPath: criticalTasks,
    };
  }, [tasksWithCriticalPath, project.workingDays, project.hoursPerDay, project.tasks.length]);

  // Event Handler
  const handleTaskChange = useCallback((task: GanttTaskType) => {
    if (readOnly) return;
    
    onTaskUpdate?.(task.id, {
      startDate: task.start,
      endDate: task.end,
      progress: task.progress,
    });
  }, [onTaskUpdate, readOnly]);

  const handleTaskClick = useCallback((task: GanttTaskType) => {
    setSelectedTask(task.id);
    const originalTask = project.tasks.find(t => t.id === task.id);
    if (originalTask) {
      onTaskSelect?.(originalTask);
    }
  }, [project.tasks, onTaskSelect]);

  const handleProgressChange = useCallback((task: GanttTaskType) => {
    if (readOnly) return;
    
    onTaskUpdate?.(task.id, {
      progress: task.progress,
    });
  }, [onTaskUpdate, readOnly]);

  const handleDoubleClick = useCallback((task: GanttTaskType) => {
    const originalTask = project.tasks.find(t => t.id === task.id);
    if (originalTask) {
      onTaskSelect?.(originalTask);
    }
  }, [project.tasks, onTaskSelect]);

  // Zoom Controls
  const zoomLevels: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: ViewMode.Day, label: 'Tag', icon: <Calendar className="w-4 h-4" /> },
    { mode: ViewMode.Week, label: 'Woche', icon: <Calendar className="w-4 h-4" /> },
    { mode: ViewMode.Month, label: 'Monat', icon: <Calendar className="w-4 h-4" /> },
  ];

  if (project.tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Noch keine Aufgaben vorhanden
        </h3>
        <p className="text-gray-500 mb-4">
          Erstellen Sie Aufgaben, um das Gantt-Diagramm zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <style>{customStyles}</style>
      
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 mr-2">Ansicht:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {zoomLevels.map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTaskList(!showTaskList)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showTaskList ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Aufgabenliste
            </button>
            
            {showResources && (
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Users className="w-4 h-4" />
                Ressourcen
              </button>
            )}
          </div>
        </div>

        {/* Critical Path Stats */}
        {showCriticalPath && (
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="critical-path-legend">
              <div className="legend-item">
                <div className="legend-dot bg-red-500"></div>
                <span>Kritischer Pfad ({stats.criticalTasks} Aufgaben)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot bg-[#14ad9f]"></div>
                <span>Normaler Task</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-gray-600">
              <span>
                <strong>{stats.projectDuration}</strong> Arbeitstage gesamt
              </span>
              <span>
                Ø Puffer: <strong>{stats.avgSlack}</strong> Tage
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleTaskChange}
          onProgressChange={handleProgressChange}
          onClick={handleTaskClick}
          onDoubleClick={handleDoubleClick}
          listCellWidth={showTaskList ? '155px' : ''}
          columnWidth={
            viewMode === ViewMode.Day ? 65 :
            viewMode === ViewMode.Week ? 250 :
            300
          }
          ganttHeight={Math.min(600, Math.max(300, ganttTasks.length * 50 + 50))}
          barCornerRadius={4}
          barFill={70}
          handleWidth={8}
          todayColor="rgba(20, 173, 159, 0.1)"
          locale="de"
          rtl={false}
        />
      </div>

      {/* Critical Path Details (collapsible) */}
      {showCriticalPath && stats.criticalPath.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">Kritischer Pfad</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.criticalPath.map((task, index) => (
              <React.Fragment key={task.id}>
                <button
                  onClick={() => {
                    setSelectedTask(task.id);
                    onTaskSelect?.(task);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedTask === task.id
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  {task.name}
                </button>
                {index < stats.criticalPath.length - 1 && (
                  <span className="text-red-400 self-center">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-3 text-sm text-red-700">
            Diese Aufgaben haben keinen Zeitpuffer. Verzögerungen verschieben das Projektende.
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================
// EXPORTS
// ============================================

export default GanttChart;
