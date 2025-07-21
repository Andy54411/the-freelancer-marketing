'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { DashboardNavbar } from '../components/DashboardNavbar';
import {
  PlusCircle,
  FolderOpen,
  Calendar,
  Clock,
  Users,
  Target,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/firebase/clients';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Gemini } from '@/components/logos';
import ProjectAssistantModal from './components/ProjectAssistantModal';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  estimatedBudget?: number;
  timeline?: string;
  aiSuggestions?: string[];
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'completed';
  assignedTo?: string;
  dueDate?: Date;
  estimatedHours?: number;
}

const ProjectsPage: React.FC = () => {
  const params = useParams();
  const uid = params?.uid as string;
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);

  // Lade Projekte aus Firestore
  useEffect(() => {
    if (!uid || !user) return;

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('userId', '==', uid), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Project[];

        setProjects(projectsData);
        setLoading(false);
      },
      error => {
        console.error('Fehler beim Laden der Projekte:', error);
        toast.error('Fehler beim Laden der Projekte');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, user]);

  const handleNewProject = () => {
    toast.info('Neues Projekt wird vorbereitet...', {
      description: 'Diese Funktion wird demnächst verfügbar sein!',
    });
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <PlayCircle className="h-4 w-4" />;
      case 'paused':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarVisibilityProvider>
          <div className="min-h-screen bg-gray-50">
            <DashboardNavbar currentUid={uid} />
            <div className="flex items-center justify-center pt-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto"></div>
                <p className="mt-4 text-gray-600">Lade Projekte...</p>
              </div>
            </div>
          </div>
        </SidebarVisibilityProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarVisibilityProvider>
        <div className="min-h-screen bg-gray-50">
          <DashboardNavbar currentUid={uid} />
          <div className="pt-20 p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="h-7 w-7 text-[#14ad9f]" />
                  KI-Project Manager
                </h1>
                <p className="text-gray-600 mt-1">
                  Verwalte deine Projekte intelligent mit KI-Unterstützung
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAssistant(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Gemini className="h-4 w-4" />
                  KI-Assistent
                </Button>
                <Button
                  onClick={handleNewProject}
                  className="flex items-center gap-2 bg-[#14ad9f] hover:bg-[#0f8a7e]"
                >
                  <PlusCircle className="h-4 w-4" />
                  Neues Projekt
                </Button>
              </div>
            </div>

            {/* Statistiken */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gesamt</p>
                      <p className="text-2xl font-bold">{projects.length}</p>
                    </div>
                    <FolderOpen className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Aktiv</p>
                      <p className="text-2xl font-bold text-green-600">
                        {projects.filter(p => p.status === 'active').length}
                      </p>
                    </div>
                    <PlayCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Planung</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {projects.filter(p => p.status === 'planning').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Abgeschlossen</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {projects.filter(p => p.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Projekt-Liste */}
            {projects.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Noch keine Projekte vorhanden
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Starte dein erstes Projekt mit KI-Unterstützung und lass dir bei der Planung
                    helfen!
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => setShowAssistant(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      KI-Projektideen
                    </Button>
                    <Button
                      onClick={handleNewProject}
                      className="flex items-center gap-2 bg-[#14ad9f] hover:bg-[#0f8a7e]"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Projekt erstellen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map(project => {
                  const progress = calculateProgress(project.tasks);
                  return (
                    <Card
                      key={project.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(project.status)}
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={getStatusColor(project.status)}>
                              {project.status}
                            </Badge>
                            <Badge className={getPriorityColor(project.priority)}>
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Fortschritt */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Fortschritt</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[#14ad9f] h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Aufgaben */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Target className="h-4 w-4" />
                            <span>{project.tasks.length} Aufgaben</span>
                            {project.tasks.filter(t => t.status === 'completed').length > 0 && (
                              <span>
                                · {project.tasks.filter(t => t.status === 'completed').length}{' '}
                                erledigt
                              </span>
                            )}
                          </div>

                          {/* Kategorie */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="secondary">{project.category}</Badge>
                            {project.estimatedBudget && (
                              <span className="text-green-600 font-medium">
                                €{project.estimatedBudget.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* KI-Vorschläge */}
                          {project.aiSuggestions && project.aiSuggestions.length > 0 && (
                            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-1 text-xs font-medium text-blue-800 mb-1">
                                <Sparkles className="h-3 w-3" />
                                KI-Vorschlag
                              </div>
                              <p className="text-xs text-blue-700 line-clamp-2">
                                {project.aiSuggestions[0]}
                              </p>
                            </div>
                          )}

                          {/* Letzte Aktualisierung */}
                          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Zuletzt bearbeitet: {project.updatedAt.toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KI-Assistent Modal */}
        {showAssistant && (
          <ProjectAssistantModal
            isOpen={showAssistant}
            onClose={() => setShowAssistant(false)}
            userId={uid}
          />
        )}
      </SidebarVisibilityProvider>
    </ProtectedRoute>
  );
};

export default ProjectsPage;
