'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  FolderOpen,
  Plus,
  Eye,
  Search,
  Calendar,
  Euro,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

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
}

interface ProjectsComponentProps {
  companyId: string;
}

export function ProjectsComponent({ companyId }: ProjectsComponentProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
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
  }, [companyId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Website Redesign',
          description: 'Komplette Überarbeitung der Unternehmenswebsite mit modernem Design',
          client: 'TechCorp GmbH',
          status: 'active',
          budget: 25000.0,
          spent: 12500.0,
          hourlyRate: 85.0,
          estimatedHours: 300,
          trackedHours: 147,
          startDate: '2025-01-15',
          endDate: '2025-03-31',
          progress: 50,
          teamMembers: ['Max Müller', 'Sarah Schmidt', 'Tom Weber'],
          tags: ['Web Development', 'Design', 'Frontend'],
        },
        {
          id: '2',
          name: 'Mobile App Development',
          description: 'Entwicklung einer nativen iOS und Android App',
          client: 'StartupXYZ',
          status: 'planning',
          budget: 45000.0,
          spent: 2000.0,
          hourlyRate: 95.0,
          estimatedHours: 500,
          trackedHours: 21,
          startDate: '2025-02-01',
          endDate: '2025-06-30',
          progress: 5,
          teamMembers: ['Lisa König', 'Mark Fischer'],
          tags: ['Mobile', 'iOS', 'Android', 'React Native'],
        },
        {
          id: '3',
          name: 'E-Commerce Platform',
          description: 'Aufbau einer maßgeschneiderten E-Commerce Lösung',
          client: 'Fashion Store AG',
          status: 'completed',
          budget: 35000.0,
          spent: 33500.0,
          hourlyRate: 90.0,
          estimatedHours: 400,
          trackedHours: 372,
          startDate: '2024-10-01',
          endDate: '2024-12-31',
          progress: 100,
          teamMembers: ['Anna Bauer', 'David Klein', 'Emma Wolf'],
          tags: ['E-Commerce', 'Backend', 'Payment'],
        },
        {
          id: '4',
          name: 'CRM Integration',
          description: 'Integration verschiedener CRM-Systeme',
          client: 'Consulting Partners',
          status: 'on-hold',
          budget: 15000.0,
          spent: 7500.0,
          hourlyRate: 80.0,
          estimatedHours: 200,
          trackedHours: 94,
          startDate: '2025-01-01',
          endDate: '2025-02-28',
          progress: 25,
          teamMembers: ['Peter Lang'],
          tags: ['CRM', 'Integration', 'API'],
        },
      ];

      setProjects(mockProjects);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
      toast.error('Projekte konnten nicht geladen werden');
    } finally {
      setLoading(false);
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

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const totalHours = projects.reduce((sum, project) => sum + project.trackedHours, 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const handleCreateProject = async () => {
    try {
      if (!newProject.name || !newProject.client) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const project: Project = {
        id: Date.now().toString(),
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
      };

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

      toast.success('Projekt wurde erstellt');
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
      toast.error('Projekt konnte nicht erstellt werden');
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projekte</h2>
          <p className="text-gray-600 mt-1">Projektverwaltung mit Budget- und Zeiterfassung</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Projekt
        </Button>
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
                  <Euro className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamtbudget</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalBudget)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ausgaben</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stunden</p>
                    <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedProject(project)}
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
                            <Progress value={project.progress} className="w-20 h-2" />
                            <span className="text-xs text-gray-500">{project.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(project.budget)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {project.trackedHours}h / {project.estimatedHours}h
                        </p>
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
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardDescription>{project.client}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Fortschritt</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Budget:</span>
                        <span className="font-medium">{formatCurrency(project.budget)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ausgaben:</span>
                        <span
                          className={
                            project.spent > project.budget
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }
                        >
                          {formatCurrency(project.spent)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Stunden:</span>
                        <span className="text-gray-900">
                          {project.trackedHours}h / {project.estimatedHours}h
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {project.teamMembers.length} Team-Mitglieder
                        </span>
                      </div>
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
                          <span className="text-xs text-gray-500">{customer.customerNumber}</span>
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
                onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
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
                onChange={e => setNewProject(prev => ({ ...prev, estimatedHours: e.target.value }))}
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
                      <span>{new Date(selectedProject.startDate).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enddatum:</span>
                      <span>{new Date(selectedProject.endDate).toLocaleDateString('de-DE')}</span>
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
                      <span className="font-medium">{formatCurrency(selectedProject.budget)}</span>
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
                    <span>{selectedProject.progress}%</span>
                  </div>
                  <Progress value={selectedProject.progress} className="h-3" />
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
