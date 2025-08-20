'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, Pause, CheckCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ProjectTeamManagement from './ProjectTeamManagement';

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled' | 'paused';
  budget: number;
  spent: number;
  hourlyRate: number;
  estimatedHours: number;
  trackedHours: number;
  startDate: string;
  endDate: string;
  progress: number;
  teamMembers: string[];
  tags: string[];
  companyId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  duration: number; // in Minuten
  startTime: Date;
  endTime: Date;
  date: string;
  companyId: string;
  createdAt: Date;
}

interface ProjectDetailViewProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  onBack: () => void;
  companyId: string;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onProjectUpdate,
  onBack,
  companyId,
}) => {
  const [loading, setLoading] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Berechne die aktuell erfassten Stunden basierend auf den geladenen timeEntries
  const currentTrackedHours = useMemo(() => {
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return Math.round((totalMinutes / 60) * 100) / 100;
  }, [timeEntries]);

  useEffect(() => {
    if (project?.id) {
      loadTimeEntries();
    }
  }, [project?.id, companyId]);

  const loadTimeEntries = async () => {
    if (!project?.id || !companyId) return;

    try {
      setLoading(true);
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('companyId', '==', companyId),
        where('projectId', '==', project.id),
        orderBy('startTime', 'desc')
      );

      const querySnapshot = await getDocs(timeEntriesQuery);
      const entries: TimeEntry[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          projectId: data.projectId || '',
          projectName: data.projectName || '',
          description: data.description || '',
          duration: data.duration || 0,
          startTime: data.startTime?.toDate?.() || new Date(),
          endTime: data.endTime?.toDate?.() || new Date(),
          date: data.date || '',
          companyId: data.companyId || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });

      setTimeEntries(entries);
    } catch (error) {
      console.error('Fehler beim Laden der Zeiteinträge:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProjectData = async () => {
    setRefreshing(true);
    await loadTimeEntries();

    // Berechne die aktuellen erfassten Stunden neu
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const trackedHours = Math.round((totalMinutes / 60) * 100) / 100;

    // Aktualisiere das Projekt mit den neuen Stunden
    const updatedProject = {
      ...project,
      trackedHours,
    };

    onProjectUpdate(updatedProject);
    setRefreshing(false);
  };

  const updateProjectStatus = async (newStatus: Project['status']) => {
    if (!project?.id) return;

    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      const updatedProject = {
        ...project,
        status: newStatus,
      };

      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Projektstatus:', error);
    }
  };

  const calculateProgress = () => {
    if (!project.estimatedHours || project.estimatedHours === 0) return 0;
    return Math.min((currentTrackedHours / project.estimatedHours) * 100, 100);
  };

  const calculateRevenue = () => {
    return currentTrackedHours * project.hourlyRate;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-[#14ad9f] text-white';
      case 'paused':
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return 'Planung';
      case 'active':
        return 'Aktiv';
      case 'paused':
      case 'on-hold':
        return 'Pausiert';
      case 'completed':
        return 'Abgeschlossen';
      case 'cancelled':
        return 'Abgebrochen';
      default:
        return 'Unbekannt';
    }
  };

  if (!project) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Kein Projekt ausgewählt</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            ← Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>
              {getStatusText(project.status)}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshProjectData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Projekt-Informationen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Projektdetails für {project.client}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Projektinformationen Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Projektinformationen</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Kunde:</span>
                  <span className="font-medium">{project.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Startdatum:</span>
                  <span className="font-medium">
                    {project.startDate
                      ? format(new Date(project.startDate), 'd.M.yyyy', { locale: de })
                      : 'Nicht gesetzt'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Enddatum:</span>
                  <span className="font-medium">
                    {project.endDate
                      ? format(new Date(project.endDate), 'd.M.yyyy', { locale: de })
                      : 'Nicht gesetzt'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stundensatz:</span>
                  <span className="font-medium">{project.hourlyRate.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Umsatz & Zeit</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Projekt-Umsatz:</span>
                  <span className="text-[#14ad9f] text-lg font-bold">
                    {calculateRevenue().toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Erfasste Stunden:</span>
                  <span className="font-medium">{currentTrackedHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stundensatz:</span>
                  <span className="font-medium">{project.hourlyRate.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stunden (geplant/erfasst):</span>
                  <span className="font-medium">
                    {project.estimatedHours}h /{' '}
                    <span className="text-[#14ad9f] font-bold">{currentTrackedHours}h</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fortschritt */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Fortschritt</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Projektfortschritt</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </div>

          {/* Beschreibung */}
          {project.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Beschreibung</h3>
              <p className="text-gray-600">{project.description}</p>
            </div>
          )}

          {/* Projekt-Aktionen */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Projekt-Aktionen</h3>
            <div className="flex space-x-2">
              {project.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => updateProjectStatus('on-hold')}
                  className="flex items-center"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausieren
                </Button>
              )}
              {(project.status === 'paused' || project.status === 'on-hold') && (
                <Button
                  variant="outline"
                  onClick={() => updateProjectStatus('active')}
                  className="flex items-center"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Fortsetzen
                </Button>
              )}
              {(project.status === 'active' ||
                project.status === 'paused' ||
                project.status === 'on-hold') && (
                <Button
                  variant="outline"
                  onClick={() => updateProjectStatus('completed')}
                  className="flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Abschließen
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zeiteinträge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Zeiteinträge ({timeEntries.length})
          </CardTitle>
          <CardDescription>
            Gesamte erfasste Zeit:{' '}
            <span className="font-semibold text-[#14ad9f]">{currentTrackedHours}h</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-[#14ad9f]" />
              <span className="ml-2">Lade Zeiteinträge...</span>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Noch keine Zeiteinträge für dieses Projekt</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {entry.description || 'Ohne Beschreibung'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(entry.duration)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {format(entry.startTime, 'dd.MM.yyyy, HH:mm', { locale: de })} -
                      {format(entry.endTime, 'HH:mm', { locale: de })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-[#14ad9f]">
                      {((entry.duration / 60) * project.hourlyRate).toFixed(2)} €
                    </div>
                    <div className="text-sm text-gray-500">
                      {(entry.duration / 60).toFixed(1)}h × {project.hourlyRate}€
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team-Management */}
      <ProjectTeamManagement
        project={{
          id: project.id,
          name: project.name,
          teamMembers: project.teamMembers,
          companyId: project.companyId,
        }}
        onProjectUpdate={onProjectUpdate}
        companyId={companyId}
      />
    </div>
  );
};

export default ProjectDetailView;
