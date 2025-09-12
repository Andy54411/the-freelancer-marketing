'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  TrendingUp,
  Pause,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
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
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    description: string;
    startTime: string;
    endTime: string;
    date: string;
  }>({
    description: '',
    startTime: '',
    endTime: '',
    date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [timeEntriesUnsubscribe, setTimeEntriesUnsubscribe] = useState<Unsubscribe | null>(null);

  // Berechne die aktuell erfassten Stunden basierend auf den geladenen timeEntries
  const currentTrackedHours = useMemo(() => {
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return Math.round((totalMinutes / 60) * 100) / 100;
  }, [timeEntries]);

  useEffect(() => {
    if (project?.id && companyId) {
      setupRealtimeTimeEntriesListener();
    }

    // Cleanup function
    return () => {
      if (timeEntriesUnsubscribe) {
        timeEntriesUnsubscribe();
      }
    };
  }, [project?.id, companyId]); // Entferne alle anderen Dependencies um Re-renders zu vermeiden

  const setupRealtimeTimeEntriesListener = () => {
    // Cleanup existing listener
    if (timeEntriesUnsubscribe) {
      timeEntriesUnsubscribe();
    }

    if (!project?.id || !companyId) return;

    // Realtime Listener für Zeiteinträge
    const timeEntriesQuery = query(
      collection(db, 'timeEntries'),
      where('companyId', '==', companyId),
      where('projectId', '==', project.id),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(
      timeEntriesQuery,
      snapshot => {
        // Sichere Funktion zur Konvertierung von Firestore Timestamps oder Date-Objekten
        const safeToDate = (value: any): Date => {
          if (!value) return new Date();
          if (value instanceof Date) return value;
          if (typeof value.toDate === 'function') return value.toDate();
          if (typeof value === 'string') return new Date(value);
          return new Date();
        };

        // Konvertiere Firestore-Daten zu TimeEntry Format
        const entries: TimeEntry[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const startTime = safeToDate(data.startTime);
          const endTime = safeToDate(data.endTime);
          const createdAt = safeToDate(data.createdAt);

          return {
            id: doc.id,
            projectId: data.projectId || '',
            projectName: data.projectName || '',
            description: data.description || '',
            duration: data.duration || 0,
            startTime,
            endTime,
            date: startTime.toISOString().split('T')[0],
            companyId: data.companyId || '',
            createdAt,
          };
        });

        setTimeEntries(entries);
        setLoading(false);
      },
      error => {
        setLoading(false);
        // Fallback: Lade Daten über API
        loadTimeEntries();
      }
    );

    setTimeEntriesUnsubscribe(() => unsubscribe);
  };

  const loadTimeEntries = async () => {
    if (!project?.id || !companyId) return;

    try {
      setLoading(true);

      // Verwende die neue API anstatt direkter Firestore-Abfrage
      const response = await fetch(
        `/api/company/${companyId}/time-entries?projectId=${project.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load time entries');
      }

      // Konvertiere API-Daten zu TimeEntry Format
      const entries: TimeEntry[] = data.timeEntries.map((entry: any) => ({
        id: entry.id,
        projectId: entry.projectId || '',
        projectName: entry.projectName || '',
        description: entry.description || '',
        duration: entry.duration || 0,
        startTime: new Date(entry.startTime),
        endTime: new Date(entry.endTime),
        date: entry.startTime ? new Date(entry.startTime).toISOString().split('T')[0] : '',
        companyId: entry.companyId || '',
        createdAt: new Date(entry.createdAt || Date.now()),
      }));
      setTimeEntries(entries);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const refreshProjectData = async () => {
    setRefreshing(true);

    try {
      // Lade Zeiteinträge neu
      await loadTimeEntries();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
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
    } catch (error) {}
  };

  const handleEditEntry = async (entryId: string) => {
    const entry = timeEntries.find(e => e.id === entryId);
    if (!entry) return;

    // Setze die Formulardaten
    setEditFormData({
      description: entry.description || '',
      startTime: format(entry.startTime, 'HH:mm'),
      endTime: format(entry.endTime, 'HH:mm'),
      date: format(entry.startTime, 'yyyy-MM-dd'),
    });

    setEditingEntry(entryId);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      setSavingEdit(true);

      // Berechne neue Start- und Endzeiten
      const startDateTime = new Date(`${editFormData.date}T${editFormData.startTime}:00`);
      const endDateTime = new Date(`${editFormData.date}T${editFormData.endTime}:00`);

      // Berechne Dauer in Minuten
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      if (duration <= 0) {
        alert('Die Endzeit muss nach der Startzeit liegen.');
        return;
      }

      const updateData = {
        description: editFormData.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        duration: duration,
        date: editFormData.date,
      };

      // API-Aufruf zum Aktualisieren
      const response = await fetch(`/api/company/${companyId}/time-entries/${editingEntry}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Aktualisieren des Zeiteintrags');
      }

      // Aktualisiere die lokale Liste
      setTimeEntries(prev =>
        prev.map(entry =>
          entry.id === editingEntry
            ? {
                ...entry,
                description: editFormData.description,
                startTime: startDateTime,
                endTime: endDateTime,
                duration: duration,
                date: editFormData.date,
              }
            : entry
        )
      );

      // Schließe das Modal
      setEditModalOpen(false);
      setEditingEntry(null);
    } catch (error) {
      alert('Fehler beim Aktualisieren des Zeiteintrags. Bitte versuchen Sie es erneut.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Zeiteintrag löschen möchten?')) {
      return;
    }

    try {
      setDeletingEntry(entryId);

      // API-Aufruf zum Löschen des Zeiteintrags
      const response = await fetch(`/api/company/${companyId}/time-entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Löschen des Zeiteintrags');
      }

      // Entferne den Eintrag aus der lokalen Liste
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      alert('Fehler beim Löschen des Zeiteintrags. Bitte versuchen Sie es erneut.');
    } finally {
      setDeletingEntry(null);
    }
  };

  const calculateProgress = () => {
    if (!project.estimatedHours || project.estimatedHours === 0) return 0;
    return Math.min((currentTrackedHours / project.estimatedHours) * 100, 100);
  };

  const calculateRevenue = () => {
    return currentTrackedHours * (project.hourlyRate || 0);
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

  const handleCreateInvoice = () => {
    // Gruppiere Zeiteinträge nach Datum für tagesweise Rechnungsposten
    const groupedByDate = timeEntries.reduce(
      (groups, entry) => {
        const date = entry.date; // Date ist bereits im YYYY-MM-DD Format
        if (!groups[date]) {
          groups[date] = {
            date: date,
            hours: 0,
            entries: [],
          };
        }
        // Konvertiere duration von Minuten zu Stunden
        const hours = entry.duration / 60;
        groups[date].hours += hours;
        groups[date].entries.push(entry);
        return groups;
      },
      {} as Record<string, { date: string; hours: number; entries: any[] }>
    );

    // Konvertiere gruppierte Daten in Array für Rechnungsposten
    const dailyLineItems = Object.values(groupedByDate).map(dayData => ({
      date: dayData.date,
      description: `${dayData.date}: ${project.name} (${dayData.hours.toFixed(1)}h)`,
      hours: dayData.hours,
      hourlyRate: project.hourlyRate || 0,
      amount: dayData.hours * (project.hourlyRate || 0),
      entries: dayData.entries,
    }));

    // Erstelle Rechnung basierend auf Projektdaten mit tagesweiser Aufschlüsselung
    const invoiceData = {
      projectId: project.id,
      projectName: project.name,
      client: project.client,
      hourlyRate: project.hourlyRate || 0,
      totalHours: currentTrackedHours,
      revenue: calculateRevenue(),
      dailyLineItems: dailyLineItems, // Tagesweise Aufschlüsselung
      timeEntries: timeEntries, // Original-Zeiteinträge zur Referenz
      teamMembers: project.teamMembers,
      description: project.description,
    };

    // Navigiere zur Rechnungserstellung mit vorausgefüllten Daten
    const params = new URLSearchParams({
      project: JSON.stringify(invoiceData),
    });

    // Verwende companyId aus Props
    window.location.href = `/dashboard/company/${companyId}/finance/invoices/create?${params.toString()}`;
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
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleCreateInvoice}
            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
            disabled={currentTrackedHours === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Rechnung erstellen
          </Button>
          <Button variant="outline" size="sm" onClick={refreshProjectData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
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
                  <span className="font-medium">{project.hourlyRate?.toFixed(2) || '0.00'} €</span>
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
                  <span className="font-medium">{project.hourlyRate?.toFixed(2) || '0.00'} €</span>
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
            <div className="space-y-4">
              {/* Gruppiere Zeiteinträge nach Datum und sortiere chronologisch */}
              {Object.entries(
                timeEntries.reduce(
                  (groups, entry) => {
                    const date = format(entry.startTime, 'yyyy-MM-dd');
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(entry);
                    return groups;
                  },
                  {} as Record<string, typeof timeEntries>
                )
              )
                .sort(([dateA], [dateB]) => {
                  // Sortiere Daten absteigend (neueste zuerst)
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .map(([date, dayEntries]) => {
                  // Sortiere auch die Einträge innerhalb eines Tages nach Startzeit (neueste zuerst)
                  const sortedDayEntries = [...dayEntries].sort(
                    (a, b) => b.startTime.getTime() - a.startTime.getTime()
                  );

                  const totalDayMinutes = sortedDayEntries.reduce(
                    (sum, entry) => sum + entry.duration,
                    0
                  );
                  const totalDayHours = Math.round((totalDayMinutes / 60) * 100) / 100;
                  const totalDayRevenue = sortedDayEntries.reduce(
                    (sum, entry) => sum + (entry.duration / 60) * (project?.hourlyRate || 0),
                    0
                  );

                  return (
                    <div
                      key={date}
                      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Datum Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-[#14ad9f]" />
                            <h4 className="font-semibold text-gray-900 text-lg">
                              {format(new Date(date), 'EEEE, dd.MM.yyyy', { locale: de })}
                            </h4>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#14ad9f] text-white">
                            {sortedDayEntries.length}{' '}
                            {sortedDayEntries.length === 1 ? 'Schicht' : 'Schichten'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-[#14ad9f]">{totalDayHours}h</div>
                            <div className="text-sm text-gray-600">
                              {totalDayRevenue.toFixed(2)} €
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Bearbeite alle Einträge des Tages
                                sortedDayEntries.forEach(entry => handleEditEntry(entry.id));
                              }}
                              className="h-8 w-8 p-0 hover:bg-[#14ad9f] hover:text-white"
                              title="Alle Einträge dieses Tages bearbeiten"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Sind Sie sicher, dass Sie alle ${sortedDayEntries.length} Zeiteinträge vom ${format(new Date(date), 'dd.MM.yyyy', { locale: de })} löschen möchten?`
                                  )
                                ) {
                                  sortedDayEntries.forEach(entry => handleDeleteEntry(entry.id));
                                }
                              }}
                              className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white"
                              title="Alle Einträge dieses Tages löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Schichten für diesen Tag */}
                      <div className="space-y-3">
                        {sortedDayEntries.map(entry => {
                          const hours = Math.round((entry.duration / 60) * 100) / 100;
                          const revenue = hours * (project?.hourlyRate || 0);

                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">
                                  {entry.description || 'Ohne Beschreibung'}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {format(entry.startTime, 'HH:mm', { locale: de })} -
                                      {format(entry.endTime, 'HH:mm', { locale: de })}
                                    </span>
                                  </span>
                                  <span className="text-[#14ad9f] font-medium">{hours}h</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {revenue.toFixed(2)} €
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {hours}h × {project?.hourlyRate || 0}€
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditEntry(entry.id)}
                                    disabled={editingEntry === entry.id}
                                    className="h-8 w-8 p-0 hover:bg-[#14ad9f] hover:text-white"
                                    title="Zeiteintrag bearbeiten"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={deletingEntry === entry.id}
                                    className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white"
                                    title="Zeiteintrag löschen"
                                  >
                                    {deletingEntry === entry.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Details des Zeiteintrags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibung der Tätigkeit..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={editFormData.date}
                onChange={e => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Startzeit</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={editFormData.startTime}
                  onChange={e => setEditFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={editFormData.endTime}
                  onChange={e => setEditFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingEntry(null);
              }}
              disabled={savingEdit}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              {savingEdit ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Speichert...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetailView;
