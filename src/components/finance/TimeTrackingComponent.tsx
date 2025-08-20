'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  Play,
  Pause,
  Square,
  Edit3,
  Trash2,
  BarChart3,
  Timer,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Folder,
  ClipboardEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TimeTrackingService,
  TimeEntry,
  Project as ProjectType,
  TimeTrackingReport,
} from '@/services/timeTrackingService';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { ManualTimeEntry } from './ManualTimeEntry';

// Firebase Project Interface (von ProjectsComponent)
interface FirebaseProject {
  id: string;
  name: string;
  description: string;
  client: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
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
  updatedAt: string;
}

interface TimeTrackingComponentProps {
  companyId: string;
  userId: string;
}

export function TimeTrackingComponent({ companyId, userId }: TimeTrackingComponentProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [firebaseProjects, setFirebaseProjects] = useState<FirebaseProject[]>([]); // Neue State für Firebase-Projekte
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timer');
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    billableThisMonth: 0,
    activeProjects: 0,
    runningTimers: 0,
  });

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Formulare
  const [newEntryForm, setNewEntryForm] = useState({
    description: '',
    projectId: '',
    customerId: '',
    customerName: '',
    hourlyRate: 75,
    billable: true,
    category: '',
  });

  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<TimeTrackingReport | null>(null);
  const [timeEntryMode, setTimeEntryMode] = useState<'timer' | 'manual'>('timer');

  useEffect(() => {
    loadData();
  }, [companyId, userId]);

  // Timer-Effekt
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Laufende Zeiterfassung überwachen
  useEffect(() => {
    if (runningEntry) {
      const startTime = runningEntry.startTime.getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      setTimerSeconds(elapsedSeconds);
      setIsRunning(true);
    } else {
      setIsRunning(false);
      setTimerSeconds(0);
    }
  }, [runningEntry]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entries, projectList, running, statistics, fbProjects] = await Promise.all([
        TimeTrackingService.getTimeEntriesByCompany(companyId, { userId }),
        TimeTrackingService.getProjectsByCompany(companyId),
        TimeTrackingService.getRunningTimeEntry(companyId, userId),
        TimeTrackingService.getTimeTrackingStats(companyId),
        loadFirebaseProjects(), // Neue Funktion zum Laden der Firebase-Projekte
      ]);

      setTimeEntries(entries);
      setProjects(projectList);
      setFirebaseProjects(fbProjects);
      setRunningEntry(running);
      setStats(statistics);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Neue Funktion zum Laden der Firebase-Projekte
  const loadFirebaseProjects = async (): Promise<FirebaseProject[]> => {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const projectSnapshot = await getDocs(projectsQuery);
      const loadedProjects: FirebaseProject[] = [];

      projectSnapshot.forEach(doc => {
        const data = doc.data();
        loadedProjects.push({
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          client: data.client || '',
          status: data.status || 'planning',
          budget: data.budget || 0,
          spent: data.spent || 0,
          hourlyRate: data.hourlyRate || 0,
          estimatedHours: data.estimatedHours || 0,
          trackedHours: data.trackedHours || 0,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          progress: data.progress || 0,
          teamMembers: data.teamMembers || [],
          tags: data.tags || [],
          companyId: data.companyId || companyId,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
      });

      return loadedProjects;
    } catch (error) {
      console.error('Fehler beim Laden der Firebase-Projekte:', error);
      return [];
    }
  };

  // Neue Funktion zum Behandeln der Projektauswahl
  const handleProjectSelection = (projectId: string) => {
    const selectedProject = firebaseProjects.find(p => p.id === projectId);

    if (selectedProject) {
      // Automatisch Stundensatz und Kunde aus dem Projekt übernehmen
      setNewEntryForm(prev => ({
        ...prev,
        projectId,
        hourlyRate: selectedProject.hourlyRate || prev.hourlyRate,
        customerName: selectedProject.client || prev.customerName,
      }));

      toast.success(
        `Projekt "${selectedProject.name}" ausgewählt - Stundensatz: ${selectedProject.hourlyRate}€`
      );
    } else {
      // Projekt entfernt
      setNewEntryForm(prev => ({
        ...prev,
        projectId,
      }));
    }
  };

  const handleStartTimer = async () => {
    try {
      if (!newEntryForm.description.trim()) {
        toast.error('Bitte geben Sie eine Beschreibung ein');
        return;
      }

      // Bereite Daten vor und filtere undefined Werte heraus
      const entryData: any = {
        companyId,
        userId,
        description: newEntryForm.description,
        hourlyRate: newEntryForm.hourlyRate,
        billable: newEntryForm.billable,
        startTime: new Date(),
      };

      // Nur definierte Werte hinzufügen
      if (newEntryForm.projectId) entryData.projectId = newEntryForm.projectId;
      if (newEntryForm.customerId) entryData.customerId = newEntryForm.customerId;
      if (newEntryForm.customerName) entryData.customerName = newEntryForm.customerName;
      if (newEntryForm.category) entryData.category = newEntryForm.category;

      const entryId = await TimeTrackingService.startTimeEntry(entryData);

      toast.success('Zeiterfassung gestartet');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Starten der Zeiterfassung:', error);
      toast.error('Zeiterfassung konnte nicht gestartet werden');
    }
  };

  const handleStopTimer = async () => {
    try {
      if (!runningEntry?.id) return;

      await TimeTrackingService.stopTimeEntry(runningEntry.id);
      toast.success('Zeiterfassung gestoppt');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Stoppen der Zeiterfassung:', error);
      toast.error('Zeiterfassung konnte nicht gestoppt werden');
    }
  };

  const handlePauseTimer = async () => {
    try {
      if (!runningEntry?.id) return;

      await TimeTrackingService.pauseTimeEntry(runningEntry.id);
      toast.success('Zeiterfassung pausiert');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Pausieren der Zeiterfassung:', error);
      toast.error('Zeiterfassung konnte nicht pausiert werden');
    }
  };

  const handleResumeTimer = async () => {
    try {
      if (!runningEntry?.id) return;

      await TimeTrackingService.resumeTimeEntry(runningEntry.id);
      toast.success('Zeiterfassung fortgesetzt');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Fortsetzen der Zeiterfassung:', error);
      toast.error('Zeiterfassung konnte nicht fortgesetzt werden');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      if (!confirm('Möchten Sie diesen Zeiteintrag wirklich löschen?')) {
        return;
      }

      await TimeTrackingService.deleteTimeEntry(entryId);
      toast.success('Zeiteintrag gelöscht');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Löschen des Zeiteintrags:', error);
      toast.error('Zeiteintrag konnte nicht gelöscht werden');
    }
  };

  const generateReport = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(1); // Erster Tag des Monats
      const endDate = new Date();

      const reportData = await TimeTrackingService.generateTimeReport(
        companyId,
        startDate,
        endDate,
        { userId }
      );

      setReport(reportData);
      setShowReport(true);
    } catch (error) {
      console.error('Fehler beim Generieren des Reports:', error);
      toast.error('Report konnte nicht generiert werden');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Play className="h-3 w-3 mr-1" />
            Läuft
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Pause className="h-3 w-3 mr-1" />
            Pausiert
          </Badge>
        );
      case 'stopped':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Square className="h-3 w-3 mr-1" />
            Gestoppt
          </Badge>
        );
      case 'billed':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <DollarSign className="h-3 w-3 mr-1" />
            Abgerechnet
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Zeiterfassung...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Zeiterfassung</h2>
          <p className="text-gray-600 mt-1">
            Erfassen Sie Arbeitszeiten und ordnen Sie sie Projekten zu
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-[#14ad9f]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Heute</p>
                <p className="text-xl font-bold text-gray-900">{stats.todayHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Diese Woche</p>
                <p className="text-xl font-bold text-gray-900">{stats.weekHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Diesen Monat</p>
                <p className="text-xl font-bold text-gray-900">{stats.monthHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Abrechenbar</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.billableThisMonth.toFixed(0)}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Projekte</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Läuft</p>
                <p className="text-xl font-bold text-gray-900">{stats.runningTimers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="entries">Einträge</TabsTrigger>
          <TabsTrigger value="projects">Projekte</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-4">
          {/* Mode Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setTimeEntryMode('timer')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    timeEntryMode === 'timer'
                      ? 'bg-[#14ad9f] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Timer className="h-4 w-4 inline mr-2" />
                  Timer
                </button>
                <button
                  onClick={() => setTimeEntryMode('manual')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    timeEntryMode === 'manual'
                      ? 'bg-[#14ad9f] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClipboardEdit className="h-4 w-4 inline mr-2" />
                  Manuell
                </button>
              </div>
            </CardContent>
          </Card>

          {timeEntryMode === 'timer' ? (
            /* Timer Widget */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="h-5 w-5 mr-2" />
                  Zeiterfassung mit Timer
                </CardTitle>
                <CardDescription>
                  Starten Sie eine neue Zeiterfassung oder verwalten Sie laufende Timer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Aktueller Timer */}
                {runningEntry ? (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <div className="text-6xl font-mono font-bold text-[#14ad9f] mb-4">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="text-lg text-gray-700 mb-2">{runningEntry.description}</div>
                    {runningEntry.projectName && (
                      <div className="text-sm text-gray-600 mb-4">
                        Projekt: {runningEntry.projectName}
                      </div>
                    )}
                    <div className="flex gap-2 justify-center">
                      {runningEntry.status === 'running' ? (
                        <>
                          <Button onClick={handlePauseTimer} variant="outline">
                            <Pause className="h-4 w-4 mr-2" />
                            Pausieren
                          </Button>
                          <Button onClick={handleStopTimer} variant="destructive">
                            <Square className="h-4 w-4 mr-2" />
                            Stoppen
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={handleResumeTimer}
                            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Fortsetzen
                          </Button>
                          <Button onClick={handleStopTimer} variant="destructive">
                            <Square className="h-4 w-4 mr-2" />
                            Stoppen
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Beschreibung *</Label>
                        <Input
                          id="description"
                          value={newEntryForm.description}
                          onChange={e =>
                            setNewEntryForm(prev => ({ ...prev, description: e.target.value }))
                          }
                          placeholder="Was arbeiten Sie gerade?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="project">
                          Projekt wählen (optional)
                          {newEntryForm.projectId && (
                            <span className="ml-2 text-sm text-green-600">✓ Ausgewählt</span>
                          )}
                        </Label>
                        <Select
                          value={newEntryForm.projectId}
                          onValueChange={handleProjectSelection}
                        >
                          <SelectTrigger
                            className={newEntryForm.projectId ? 'ring-1 ring-green-500' : ''}
                          >
                            <SelectValue placeholder="Projekt wählen (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {firebaseProjects.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                <div className="flex flex-col">
                                  <span>{project.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {project.client} • {project.hourlyRate}€/h
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Kunde</Label>
                        <Input
                          id="customerName"
                          value={newEntryForm.customerName}
                          onChange={e =>
                            setNewEntryForm(prev => ({ ...prev, customerName: e.target.value }))
                          }
                          placeholder="Kundenname (optional)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Stundensatz (€)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.01"
                          value={newEntryForm.hourlyRate}
                          onChange={e =>
                            setNewEntryForm(prev => ({
                              ...prev,
                              hourlyRate: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Kategorie</Label>
                        <Input
                          id="category"
                          value={newEntryForm.category}
                          onChange={e =>
                            setNewEntryForm(prev => ({ ...prev, category: e.target.value }))
                          }
                          placeholder="z.B. Entwicklung, Meeting"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="billable"
                        checked={newEntryForm.billable}
                        onChange={e =>
                          setNewEntryForm(prev => ({ ...prev, billable: e.target.checked }))
                        }
                        className="w-4 h-4 text-[#14ad9f]"
                      />
                      <Label htmlFor="billable">Abrechenbar</Label>
                    </div>

                    <div className="text-center">
                      <Button
                        onClick={handleStartTimer}
                        disabled={!newEntryForm.description.trim()}
                        className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white px-8 py-3 text-lg"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Timer starten
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Manual Time Entry */
            <ManualTimeEntry
              companyId={companyId}
              userId={userId}
              projects={firebaseProjects.map(project => ({
                id: project.id,
                name: project.name,
                client: project.client,
                hourlyRate: project.hourlyRate,
              }))}
              onTimeEntryCreated={loadData}
            />
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          {/* Zeiteinträge Liste */}
          <Card>
            <CardHeader>
              <CardTitle>Zeiteinträge</CardTitle>
              <CardDescription>Alle erfassten Arbeitszeiten im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Zeiteinträge vorhanden
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Starten Sie Ihren ersten Timer oder erstellen Sie einen manuellen Eintrag.
                  </p>
                  <Button
                    onClick={() => setActiveTab('timer')}
                    className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  >
                    Timer starten
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Clock className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.description}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {entry.startTime.toLocaleDateString()} •
                              {entry.startTime.toLocaleTimeString()} -
                              {entry.endTime ? entry.endTime.toLocaleTimeString() : 'Läuft'}
                            </span>
                            {entry.projectName && (
                              <>
                                <span className="text-sm text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{entry.projectName}</span>
                              </>
                            )}
                            {getStatusBadge(entry.status)}
                            {entry.billable && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Abrechenbar
                              </Badge>
                            )}
                          </div>
                          {entry.customerName && (
                            <div className="text-xs text-gray-500 mt-1">
                              Kunde: {entry.customerName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {entry.duration ? formatDuration(entry.duration) : '-'}
                          </div>
                          {entry.billableAmount && (
                            <div className="text-sm text-gray-600">
                              {entry.billableAmount.toFixed(2)}€
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              /* Edit functionality */
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {/* Projekte Liste */}
          <Card>
            <CardHeader>
              <CardTitle>Projekte</CardTitle>
              <CardDescription>Verwalten Sie Ihre Projekte für die Zeiterfassung</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Projekte vorhanden
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie Ihr erstes Projekt um Arbeitszeiten zu organisieren.
                  </p>
                  <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
                    Erstes Projekt erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Folder className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{project.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">{project.customerName}</span>
                            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {project.totalHours?.toFixed(1) || 0}h
                          </div>
                          {project.totalAmount && (
                            <div className="text-sm text-gray-600">
                              {project.totalAmount.toFixed(2)}€
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Modal */}
      {showReport && report && (
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Zeiterfassungs-Report</DialogTitle>
              <DialogDescription>
                {report.period.start.toLocaleDateString()} bis{' '}
                {report.period.end.toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {report.summary.totalHours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Gesamt</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#14ad9f]">
                    {report.summary.billableHours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Abrechenbar</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {report.summary.billableAmount.toFixed(2)}€
                  </div>
                  <div className="text-sm text-gray-600">Umsatz</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.summary.averageHourlyRate.toFixed(2)}€
                  </div>
                  <div className="text-sm text-gray-600">⌀ Stundensatz</div>
                </div>
              </div>

              {/* Nach Kunde */}
              {report.byCustomer.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Nach Kunde</h4>
                  <div className="space-y-2">
                    {report.byCustomer.map((customer, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded"
                      >
                        <span className="font-medium">{customer.customerName}</span>
                        <div className="text-right">
                          <div>{customer.billableHours.toFixed(1)}h</div>
                          <div className="text-sm text-gray-600">
                            {customer.totalAmount.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nach Projekt */}
              {report.byProject.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Nach Projekt</h4>
                  <div className="space-y-2">
                    {report.byProject.map((project, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded"
                      >
                        <span className="font-medium">{project.projectName}</span>
                        <div className="text-right">
                          <div>{project.billableHours.toFixed(1)}h</div>
                          <div className="text-sm text-gray-600">
                            {project.totalAmount.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReport(false)}>
                  Schließen
                </Button>
                <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">PDF Export</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
