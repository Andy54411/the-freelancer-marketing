'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Customer } from './AddCustomerModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Progress } from '@/components/ui/progress';
import {
  FolderOpen,
  Plus,
  Eye,
  Search,
  Euro,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  BarChart3,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProjectDetailView } from './ProjectDetailView';

interface Project {
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

interface ProjectsComponentProps {
  companyId: string;
}

export function ProjectsComponent({ companyId }: ProjectsComponentProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state for new project
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    budget: '',
    hourlyRate: '',
    estimatedHours: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadProjects();
    loadCustomers();

    // Automatische Aktualisierung alle 30 Sekunden
    const interval = setInterval(() => {
      refreshProjects();
    }, 30000);

    return () => clearInterval(interval);
  }, [companyId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsQuery = query(
        collection(db, 'projects'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(projectsQuery);
      const loadedProjects: Project[] = [];

      // Lade auch die Zeiteinträge für jedes Projekt
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const projectId = docSnapshot.id;

        // Berechne die tatsächlich erfassten Stunden für dieses Projekt
        const actualTrackedHours = await calculateTrackedHours(projectId);

        loadedProjects.push({
          id: projectId,
          name: data.name || '',
          description: data.description || '',
          client: data.client || '',
          status: data.status || 'planning',
          budget: data.budget || 0,
          spent: data.spent || 0,
          hourlyRate: data.hourlyRate || 0,
          estimatedHours: data.estimatedHours || 0,
          trackedHours: actualTrackedHours, // Verwende die berechneten Stunden
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          progress: data.progress || 0,
          teamMembers: data.teamMembers || [],
          tags: data.tags || [],
          companyId: data.companyId || companyId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }

      setProjects(loadedProjects);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
      toast.error('Projekte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Neue Funktion: Berechne die tatsächlich erfassten Stunden für ein Projekt
  const calculateTrackedHours = async (projectId: string): Promise<number> => {
    try {
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('companyId', '==', companyId),
        where('projectId', '==', projectId)
      );

      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      let totalHours = 0;

      timeEntriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.duration && typeof data.duration === 'number') {
          // Duration ist in MINUTEN gespeichert, konvertiere zu Stunden
          totalHours += data.duration / 60;
        }
      });
      return Math.round(totalHours * 100) / 100; // Runde auf 2 Dezimalstellen
    } catch (error) {
      console.error(`Fehler beim Berechnen der Stunden für Projekt ${projectId}:`, error);
      return 0;
    }
  };

  // Hilfsfunktion: Berechne Projektfortschritt basierend auf Stunden
  const calculateProgress = (project: Project): number => {
    if (project.estimatedHours <= 0) return 0;
    const progress = (project.trackedHours / project.estimatedHours) * 100;
    return Math.min(progress, 100); // Maximal 100%
  };

  // Hilfsfunktion: Berechne Projektumsatz
  const calculateRevenue = (project: Project): number => {
    return project.trackedHours * project.hourlyRate;
  };

  const refreshProjects = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const deleteProject = async (projectId: string, projectName: string) => {
    if (
      !window.confirm(
        `Sind Sie sicher, dass Sie das Projekt "${projectName}" dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }

    try {
      const projectRef = doc(db, 'projects', projectId);
      await deleteDoc(projectRef);

      // Entferne das Projekt aus dem lokalen State
      setProjects(prev => prev.filter(p => p.id !== projectId));

      toast.success('Projekt erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen des Projekts:', error);
      toast.error('Fehler beim Löschen des Projekts');
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(customersQuery);
      const loadedCustomers: Customer[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedCustomers.push({
          id: doc.id,
          customerNumber: data.customerNumber || 'KD-000',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone,
          address: data.address || '',
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          taxNumber: data.taxNumber,
          vatId: data.vatId,
          vatValidated: data.vatValidated || false,
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        });
      });

      setCustomers(loadedCustomers);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
      toast.error('Kunden konnten nicht geladen werden');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Handler für Detailansicht
  const handleViewProject = (project: Project) => {
    setSelectedProjectForDetail(project);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProjectForDetail(null);
  };

  const handleProjectUpdate = async (updatedProject: Project) => {
    // Lokale Aktualisierung des Projekts im State
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
    setSelectedProjectForDetail(updatedProject);

    // Lade alle Projekte neu, um sicherzustellen, dass trackedHours korrekt berechnet werden
    await refreshProjects();
  };

  const getStatusBadge = (status: Project['status']) => {
    const statusConfig = {
      planning: { label: 'Planung', className: 'bg-blue-100 text-blue-800', icon: Settings },
      active: { label: 'Aktiv', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'on-hold': {
        label: 'Pausiert',
        className: 'bg-yellow-100 text-yellow-800',
        icon: AlertCircle,
      },
      completed: {
        label: 'Abgeschlossen',
        className: 'bg-gray-100 text-gray-800',
        icon: CheckCircle,
      },
      cancelled: { label: 'Abgebrochen', className: 'bg-red-100 text-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = projects.reduce((sum, project) => sum + calculateRevenue(project), 0);
  const totalHours = projects.reduce((sum, project) => sum + project.trackedHours, 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const handleCreateProject = async () => {
    try {
      if (!newProject.name || !newProject.client) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Create project data for Firebase
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        client: newProject.client,
        status: 'planning' as const,
        budget: parseFloat(newProject.budget) || 0,
        spent: 0,
        hourlyRate: parseFloat(newProject.hourlyRate) || 0,
        estimatedHours: parseFloat(newProject.estimatedHours) || 0,
        trackedHours: 0,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        progress: 0,
        teamMembers: [],
        tags: [],
        companyId: companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add to Firebase
      const docRef = await addDoc(collection(db, 'projects'), projectData);

      // Create local project object for immediate UI update
      const project: Project = {
        id: docRef.id,
        name: newProject.name,
        description: newProject.description,
        client: newProject.client,
        status: 'planning',
        budget: parseFloat(newProject.budget) || 0,
        spent: 0,
        hourlyRate: parseFloat(newProject.hourlyRate) || 0,
        estimatedHours: parseFloat(newProject.estimatedHours) || 0,
        trackedHours: 0,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        progress: 0,
        teamMembers: [],
        tags: [],
        companyId: companyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update local state immediately
      setProjects(prev => [project, ...prev]);
      setShowCreateModal(false);

      // Reset form
      setNewProject({
        name: '',
        description: '',
        client: '',
        budget: '',
        hourlyRate: '',
        estimatedHours: '',
        startDate: '',
        endDate: '',
      });

      toast.success('Projekt wurde erfolgreich erstellt');
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
      toast.error('Projekt konnte nicht erstellt werden');
    }
  };

  const handleStatusUpdate = async (projectId: string, newStatus: Project['status']) => {
    try {
      // Update in Firebase
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setProjects(prev =>
        prev.map(project =>
          project.id === projectId
            ? { ...project, status: newStatus, updatedAt: new Date().toISOString() }
            : project
        )
      );

      // Update selected project if it's the one being updated
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(prev =>
          prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
        );
      }

      toast.success(`Projektstatus wurde auf "${getStatusLabel(newStatus)}" geändert`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Projektstatus:', error);
      toast.error('Projektstatus konnte nicht geändert werden');
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    const statusLabels = {
      planning: 'Planung',
      active: 'Aktiv',
      'on-hold': 'Pausiert',
      completed: 'Abgeschlossen',
      cancelled: 'Abgebrochen',
    };
    return statusLabels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Projekte...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bedingte Anzeige: Liste oder Detailansicht */}
      {viewMode === 'detail' && selectedProjectForDetail ? (
        <ProjectDetailView
          project={selectedProjectForDetail}
          onProjectUpdate={handleProjectUpdate}
          onBack={handleBackToList}
          companyId={companyId}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Projekte</h2>
              <p className="text-gray-600 mt-1">Projektverwaltung mit Budget- und Zeiterfassung</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={refreshProjects} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neues Projekt
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="projects">Projekte</TabsTrigger>
              <TabsTrigger value="analytics">Analysen</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <FolderOpen className="h-8 w-8 text-[#14ad9f]" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Aktive Projekte</p>
                        <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Euro className="h-8 w-8 text-[#14ad9f]" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Gesamtumsatz</p>
                        <p className="text-2xl font-bold text-[#14ad9f]">
                          {formatCurrency(totalRevenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Erfasste Stunden</p>
                        <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Euro className="h-8 w-8 text-orange-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Ø Stundensatz</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {totalHours > 0
                            ? (totalRevenue / totalHours).toFixed(0)
                            : projects.length > 0
                              ? (
                                  projects.reduce((sum, p) => sum + p.hourlyRate, 0) /
                                  projects.length
                                ).toFixed(0)
                              : '0'}{' '}
                          €
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Aktuelle Projekte</CardTitle>
                  <CardDescription>Die neuesten und aktiven Projekte im Überblick</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects
                      .filter(p => p.status === 'active' || p.status === 'planning')
                      .slice(0, 3)
                      .map(project => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-[#14ad9f] bg-opacity-10 rounded-full">
                              <FolderOpen className="h-6 w-6 text-[#14ad9f]" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{project.name}</h4>
                              <p className="text-sm text-gray-600">{project.client}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {getStatusBadge(project.status)}
                                <Progress value={calculateProgress(project)} className="w-20 h-2" />
                                <span className="text-xs text-gray-500">
                                  {calculateProgress(project).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium text-[#14ad9f]">
                                {formatCurrency(calculateRevenue(project))}
                              </p>
                              <p className="text-sm text-gray-600">
                                {project.estimatedHours}h / {project.trackedHours}h
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProject(project)}
                                className="flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>

                              {project.status === 'cancelled' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteProject(project.id, project.name)}
                                  className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Löschen
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewProject(project)}
                                  className="flex items-center"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Bearbeiten
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Projekte suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="planning">Planung</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="on-hold">Pausiert</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="cancelled">Abgebrochen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projects Grid */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Keine Projekte gefunden'
                      : 'Keine Projekte vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Versuchen Sie andere Filter oder Suchbegriffe'
                      : 'Erstellen Sie Ihr erstes Projekt um zu beginnen'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Erstes Projekt erstellen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map(project => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          {getStatusBadge(project.status)}
                        </div>
                        <CardDescription>{project.client}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {project.description}
                        </p>

                        <div className="space-y-3 mb-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Fortschritt</span>
                              <span>{calculateProgress(project).toFixed(0)}%</span>
                            </div>
                            <Progress value={calculateProgress(project)} className="h-2" />
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Umsatz:</span>
                            <span className="font-medium text-[#14ad9f]">
                              {formatCurrency(calculateRevenue(project))}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Erfasste Stunden:</span>
                            <span className="text-gray-900">{project.trackedHours}h</span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Stunden:</span>
                            <span className="text-gray-900">
                              {project.estimatedHours}h / {project.trackedHours}h
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 pt-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {project.teamMembers.length} Team-Mitglieder
                            </span>
                          </div>
                        </div>

                        {/* Aktions-Buttons */}
                        <div className="flex space-x-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleViewProject(project);
                            }}
                            className="flex-1 flex items-center justify-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>

                          {project.status === 'cancelled' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                deleteProject(project.id, project.name);
                              }}
                              className="flex-1 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Löschen
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleViewProject(project);
                              }}
                              className="flex-1 flex items-center justify-center"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Bearbeiten
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Projekt-Analysen</CardTitle>
                  <CardDescription>Detaillierte Auswertungen und Kennzahlen</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analysen verfügbar</h3>
                    <p className="text-gray-600 mb-4">
                      Detaillierte Berichte und Grafiken zur Projektperformance
                    </p>
                    <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analysen anzeigen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Create Project Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Neues Projekt erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie ein neues Projekt mit Budget- und Zeitplanung
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projektname *</Label>
                  <Input
                    value={newProject.name}
                    onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Website Redesign"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kunde *</Label>
                  <Select
                    value={newProject.client}
                    onValueChange={value => setNewProject(prev => ({ ...prev, client: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <SelectItem value="" disabled>
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Lade Kunden...
                          </div>
                        </SelectItem>
                      ) : customers.length === 0 ? (
                        <SelectItem value="" disabled>
                          Keine Kunden verfügbar
                        </SelectItem>
                      ) : (
                        customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-gray-500">
                                {customer.customerNumber}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={newProject.description}
                    onChange={e =>
                      setNewProject(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Kurze Projektbeschreibung..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Budget (€)</Label>
                  <Input
                    type="number"
                    value={newProject.budget}
                    onChange={e => setNewProject(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="25000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stundensatz (€)</Label>
                  <Input
                    type="number"
                    value={newProject.hourlyRate}
                    onChange={e => setNewProject(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    placeholder="85"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Geschätzte Stunden</Label>
                  <Input
                    type="number"
                    value={newProject.estimatedHours}
                    onChange={e =>
                      setNewProject(prev => ({ ...prev, estimatedHours: e.target.value }))
                    }
                    placeholder="300"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  <Input
                    type="date"
                    value={newProject.startDate}
                    onChange={e => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Enddatum</Label>
                  <Input
                    type="date"
                    value={newProject.endDate}
                    onChange={e => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={handleCreateProject}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  Projekt erstellen
                </Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Abbrechen
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Project Detail Modal */}
          {selectedProject && (
            <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedProject.name}
                    {getStatusBadge(selectedProject.status)}
                  </DialogTitle>
                  <DialogDescription>Projektdetails für {selectedProject.client}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Projektinformationen</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kunde:</span>
                          <span>{selectedProject.client}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Startdatum:</span>
                          <span>
                            {new Date(selectedProject.startDate).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Enddatum:</span>
                          <span>
                            {new Date(selectedProject.endDate).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stundensatz:</span>
                          <span>{formatCurrency(selectedProject.hourlyRate)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Budget & Zeit</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Budget:</span>
                          <span className="font-medium">
                            {formatCurrency(selectedProject.budget)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ausgaben:</span>
                          <span
                            className={
                              selectedProject.spent > selectedProject.budget
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            {formatCurrency(selectedProject.spent)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Verbleibendes Budget:</span>
                          <span
                            className={
                              selectedProject.budget - selectedProject.spent < 0
                                ? 'text-red-600 font-medium'
                                : 'text-green-600'
                            }
                          >
                            {formatCurrency(selectedProject.budget - selectedProject.spent)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stunden (geplant/erfasst):</span>
                          <span>
                            {selectedProject.estimatedHours}h / {selectedProject.trackedHours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Fortschritt</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Projektfortschritt</span>
                        <span>{calculateProgress(selectedProject).toFixed(0)}%</span>
                      </div>
                      <Progress value={calculateProgress(selectedProject)} className="h-3" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Beschreibung</h4>
                    <p className="text-gray-600 text-sm">{selectedProject.description}</p>
                  </div>

                  {selectedProject.teamMembers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Team-Mitglieder</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.teamMembers.map((member, index) => (
                          <Badge key={index} variant="outline">
                            {member}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProject.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.tags.map((tag, index) => (
                          <Badge key={index} className="bg-[#14ad9f] bg-opacity-10 text-[#14ad9f]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Projekt-Aktionen</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.status === 'planning' && (
                        <Button
                          onClick={() => handleStatusUpdate(selectedProject.id, 'active')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Projekt beginnen
                        </Button>
                      )}

                      {selectedProject.status === 'active' && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(selectedProject.id, 'on-hold')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            size="sm"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Pausieren
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(selectedProject.id, 'completed')}
                            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Abschließen
                          </Button>
                        </>
                      )}

                      {selectedProject.status === 'on-hold' && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(selectedProject.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Fortsetzen
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(selectedProject.id, 'completed')}
                            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Abschließen
                          </Button>
                        </>
                      )}

                      {(selectedProject.status === 'planning' ||
                        selectedProject.status === 'active' ||
                        selectedProject.status === 'on-hold') && (
                        <Button
                          onClick={() => handleStatusUpdate(selectedProject.id, 'cancelled')}
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          size="sm"
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Abbrechen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
