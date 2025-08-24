'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  FolderOpen,
  Calendar,
  Clock,
  Users,
  Target,
  Brain,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
} from 'firebase/firestore';
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
  startDate?: string;
  endDate?: string;
  preferredDate?: string;
  aiSuggestions?: string[];
  tasks: Task[];
  proposals?: any[];
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
  const router = useRouter();
  const uid = params?.uid as string;
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    projectId: string;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: '',
    projectTitle: '',
  });

  // Lade Projekte aus Firestore
  useEffect(() => {
    if (!uid || !user) return;

    console.log('🔍 Suche Projekte für User:', { uid, userUid: user.uid });

    // Verwende project_requests Collection als "Projekte" da dort die echten Projekte sind
    const loadUserProjects = async () => {
      try {
        // Lade project_requests für den User
        const projectRequestsRef = collection(db, 'project_requests');
        const projectRequestsQuery = query(projectRequestsRef, where('customerUid', '==', uid));
        const projectRequestsSnapshot = await getDocs(projectRequestsQuery);

        console.log(
          '📦 project_requests Collection (User Projekte):',
          projectRequestsSnapshot.docs.length,
          'Dokumente'
        );

        const userProjects: Project[] = projectRequestsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 Project Request als Projekt:', {
            id: doc.id,
            title: data.title,
            status: data.status,
            customerUid: data.customerUid,
            category: data.category,
          });

          return {
            id: doc.id,
            title: data.title || 'Unbenanntes Projekt',
            description: data.description || '',
            status:
              data.status === 'completed'
                ? 'completed'
                : data.status === 'in_progress'
                  ? 'active'
                  : data.status === 'cancelled'
                    ? 'paused'
                    : 'planning',
            priority:
              data.urgency === 'high' ? 'high' : data.urgency === 'medium' ? 'medium' : 'low',
            category: data.category || '',
            estimatedBudget: data.budgetAmount || data.maxBudget || 0,
            timeline: data.timeline || '',
            startDate: data.startDate || undefined,
            endDate: data.endDate || undefined,
            preferredDate: data.preferredDate || undefined,
            tasks: [],
            proposals: data.proposals || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          };
        });

        console.log('✅ Finale User-Projekte (von project_requests):', userProjects.length);
        setProjects(userProjects);
        setLoading(false);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Projekte:', error);
        toast.error('Fehler beim Laden der Projekte');
        setLoading(false);
      }
    };

    loadUserProjects();
  }, [uid, user]);

  const handleNewProject = () => {
    router.push(`/dashboard/user/${uid}/projects/create`);
  };

  const handleDeleteProject = (projectId: string, projectTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      projectId,
      projectTitle,
    });
  };

  const confirmDeleteProject = async () => {
    try {
      const { projectId } = deleteDialog;

      // Lösche das Projekt aus der project_requests Collection
      await deleteDoc(doc(db, 'project_requests', projectId));

      // Entferne das Projekt aus dem lokalen State
      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));

      toast.success('Projekt erfolgreich gelöscht');

      // Dialog schließen
      setDeleteDialog({
        isOpen: false,
        projectId: '',
        projectTitle: '',
      });
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Projekts:', error);
      toast.error('Fehler beim Löschen des Projekts');
    }
  };

  const cancelDeleteProject = () => {
    setDeleteDialog({
      isOpen: false,
      projectId: '',
      projectTitle: '',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Lade Projekte...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 pt-20 pb-12 px-4 lg:px-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="h-7 w-7 text-white" />
              KI-Project Manager
            </h1>
            <p className="text-white/80 mt-1">
              Verwalte deine Projekte intelligent mit KI-Unterstützung
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAssistant(true)}
              variant="outline"
              className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Gemini className="h-4 w-4" />
              KI-Assistent
            </Button>
            <Button
              onClick={handleNewProject}
              className="flex items-center gap-2 bg-white/90 hover:bg-white text-[#14ad9f] hover:text-[#14ad9f]"
            >
              <PlusCircle className="h-4 w-4" />
              Neues Projekt
            </Button>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gesamt</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-[#14ad9f]" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
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
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
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
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
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
          <Card className="text-center py-12 bg-white/95 backdrop-blur-sm border-white/20">
            <CardContent>
              <FolderOpen className="h-16 w-16 text-[#14ad9f] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Projekte</h3>
              <p className="text-gray-600 mb-6">
                Starte dein erstes Projekt und nutze die KI-Unterstützung für optimale Ergebnisse.
              </p>
              <Button
                onClick={handleNewProject}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Erstes Projekt erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {projects.map(project => {
              const statusIcon = getStatusIcon(project.status);
              const priorityColor = getPriorityColor(project.priority);

              return (
                <Card
                  key={project.id}
                  className="bg-white/95 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/dashboard/user/${uid}/projects/${project.id}`}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            {statusIcon}
                            <CardTitle className="text-lg hover:text-[#14ad9f] transition-colors">
                              {project.title}
                            </CardTitle>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${priorityColor} border-current`}>
                          {project.priority === 'low'
                            ? 'Niedrig'
                            : project.priority === 'medium'
                              ? 'Mittel'
                              : 'Hoch'}
                        </Badge>
                        <Badge variant="secondary">
                          {project.status === 'planning'
                            ? 'Planung'
                            : project.status === 'active'
                              ? 'Aktiv'
                              : project.status === 'paused'
                                ? 'Pausiert'
                                : 'Abgeschlossen'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.preventDefault();
                                handleDeleteProject(project.id, project.title);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Projekt löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Link href={`/dashboard/user/${uid}/projects/${project.id}`}>
                      <CardDescription className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                        {project.description}
                      </CardDescription>
                    </Link>
                  </CardHeader>
                  <Link href={`/dashboard/user/${uid}/projects/${project.id}`}>
                    <CardContent className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {(() => {
                              if (project.startDate && project.endDate) {
                                const startDate = new Date(project.startDate).toLocaleDateString(
                                  'de-DE'
                                );
                                const endDate = new Date(project.endDate).toLocaleDateString(
                                  'de-DE'
                                );
                                return `${startDate} - ${endDate}`;
                              } else if (project.startDate) {
                                const startDate = new Date(project.startDate).toLocaleDateString(
                                  'de-DE'
                                );
                                return `Start: ${startDate}`;
                              } else if (project.endDate) {
                                const endDate = new Date(project.endDate).toLocaleDateString(
                                  'de-DE'
                                );
                                return `Ende: ${endDate}`;
                              } else if (project.preferredDate) {
                                const preferredDate = new Date(
                                  project.preferredDate
                                ).toLocaleDateString('de-DE');
                                return `Wunschtermin: ${preferredDate}`;
                              } else {
                                return project.timeline || 'Kein Zeitrahmen';
                              }
                            })()}
                          </span>
                          {project.estimatedBudget && (
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {project.estimatedBudget.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {project.proposals?.length || 0} Angebote
                          </span>
                        </div>
                        <div className="text-right">
                          <span>
                            Zuletzt bearbeitet: {project.updatedAt.toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}

        {/* KI-Assistent Modal */}
        {showAssistant && (
          <ProjectAssistantModal
            isOpen={showAssistant}
            onClose={() => setShowAssistant(false)}
            userId={uid}
          />
        )}

        {/* Lösch-Bestätigungsdialog */}
        <AlertDialog
          open={deleteDialog.isOpen}
          onOpenChange={open => !open && cancelDeleteProject()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Projekt löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie das Projekt "{deleteDialog.projectTitle}" löschen möchten?
                Diese Aktion kann nicht rückgängig gemacht werden. Alle Angebote und Daten zu diesem
                Projekt gehen verloren.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteProject}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Projekt löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ProjectsPage;
