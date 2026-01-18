'use client';

/**
 * Resource Histogram Komponente
 * 
 * Features:
 * - Auslastungsübersicht pro Ressource
 * - Kapazitäts- vs. Auslastungsvergleich
 * - Überlastungswarnung
 * - Zeitraumauswahl
 */

import React, { useMemo, useState } from 'react';
import {
  Project,
  ProjectResource,
  ProjectTask,
  ResourceManager,
} from '@/services/ProjectService';
import {
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ResourceHistogramProps {
  project: Project;
  onResourceClick?: (resource: ProjectResource) => void;
}

interface ResourceBarData {
  date: Date;
  allocated: number;
  capacity: number;
  isOverloaded: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
};

const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' });
};

const getWeekDates = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  // Finde den Montag der Woche
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// ============================================
// RESOURCE BAR COMPONENT
// ============================================

interface ResourceBarProps {
  resource: ProjectResource;
  data: ResourceBarData[];
  onClick?: () => void;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resource, data, onClick }) => {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.allocated, d.capacity)),
    resource.capacity
  );
  
  const avgUtilization = data.length > 0
    ? data.reduce((sum, d) => sum + (d.capacity > 0 ? (d.allocated / d.capacity) * 100 : 0), 0) / data.length
    : 0;

  const overloadedDays = data.filter(d => d.isOverloaded).length;

  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${resource.color || '#14ad9f'}20` }}
          >
            <Users className="w-5 h-5" style={{ color: resource.color || '#14ad9f' }} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{resource.name}</h4>
            <p className="text-sm text-gray-500">
              {resource.capacity}h/Tag Kapazität
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            {avgUtilization > 100 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : avgUtilization > 80 ? (
              <TrendingUp className="w-4 h-4 text-amber-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <span className={`text-lg font-bold ${
              avgUtilization > 100 ? 'text-red-600' :
              avgUtilization > 80 ? 'text-amber-600' :
              'text-green-600'
            }`}>
              {Math.round(avgUtilization)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">Auslastung</p>
        </div>
      </div>

      {/* Overload Warning */}
      {overloadedDays > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{overloadedDays} Tage überlastet</span>
        </div>
      )}

      {/* Histogram Bars */}
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          const allocatedHeight = maxValue > 0 ? (d.allocated / maxValue) * 100 : 0;
          const capacityHeight = maxValue > 0 ? (d.capacity / maxValue) * 100 : 0;
          const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full h-20 flex items-end">
                {/* Capacity Line */}
                <div 
                  className="absolute w-full border-t-2 border-dashed border-gray-300"
                  style={{ bottom: `${capacityHeight}%` }}
                />
                
                {/* Allocated Bar */}
                <div
                  className={`w-full rounded-t transition-all ${
                    d.isOverloaded ? 'bg-red-500' :
                    d.allocated > d.capacity * 0.8 ? 'bg-amber-500' :
                    'bg-[#14ad9f]'
                  } ${isWeekend ? 'opacity-30' : ''}`}
                  style={{ height: `${allocatedHeight}%` }}
                />
              </div>
              <span className={`text-xs ${isWeekend ? 'text-gray-300' : 'text-gray-500'}`}>
                {formatDateShort(d.date).split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[#14ad9f]"></div>
          <span>Zugewiesen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-gray-300"></div>
          <span>Kapazität</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>Überlastet</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ResourceHistogram: React.FC<ResourceHistogramProps> = ({
  project,
  onResourceClick,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const resourceManager = useMemo(() => {
    return new ResourceManager(project.tasks, project.resources);
  }, [project.tasks, project.resources]);

  const resourceData = useMemo(() => {
    return project.resources.map(resource => {
      const data: ResourceBarData[] = weekDates.map(date => ({
        date,
        allocated: resourceManager.getResourceAllocation(resource.id, date),
        capacity: resource.capacity,
        isOverloaded: resourceManager.isResourceOverloaded(resource.id, date),
      }));

      return { resource, data };
    });
  }, [project.resources, weekDates, resourceManager]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (project.resources.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Keine Ressourcen definiert
        </h3>
        <p className="text-gray-500 mb-4">
          Fügen Sie Ressourcen zum Projekt hinzu, um die Auslastung zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900">
            {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
          </span>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(() => {
          const totalCapacity = project.resources.reduce((sum, r) => sum + r.capacity * 5, 0); // 5 Arbeitstage
          const totalAllocated = resourceData.reduce((sum, { data }) => 
            sum + data.filter(d => d.date.getDay() >= 1 && d.date.getDay() <= 5)
              .reduce((s, d) => s + d.allocated, 0), 0
          );
          const overloadedCount = resourceData.filter(({ data }) => 
            data.some(d => d.isOverloaded)
          ).length;

          return (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Gesamtkapazität</p>
                <p className="text-2xl font-bold text-gray-900">{totalCapacity}h</p>
                <p className="text-xs text-gray-400">diese Woche</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Zugewiesen</p>
                <p className="text-2xl font-bold text-[#14ad9f]">{Math.round(totalAllocated)}h</p>
                <p className="text-xs text-gray-400">
                  {totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0}% Auslastung
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Überlastet</p>
                <p className={`text-2xl font-bold ${overloadedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {overloadedCount} / {project.resources.length}
                </p>
                <p className="text-xs text-gray-400">Ressourcen</p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Resource Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {resourceData.map(({ resource, data }) => (
          <ResourceBar
            key={resource.id}
            resource={resource}
            data={data}
            onClick={() => onResourceClick?.(resource)}
          />
        ))}
      </div>
    </div>
  );
};

export default ResourceHistogram;
