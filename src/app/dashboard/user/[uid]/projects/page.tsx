'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  FolderOpen,
  Calendar,
  Clock,
  Brain,
  CheckCircle2,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { collection, query, where, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Gemini } from '@/components/logos';
import ProjectAssistantModal from './components/ProjectAssistantModal';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  category: string;
  timeline: string;
  estimatedBudget: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  customerUid: string;
  userUid?: string;
  proposalsCount?: number;
  viewCount?: number;
  isPartOfBundle?: boolean;
  bundleId?: string;
  parentBundle?: string;
  // Felder für direkte Zuweisung
  selectedProviders?: string[];
  hasSelectedProviders?: boolean;
  isDirectAssignment?: boolean;
  isPublic?: boolean;
}

interface ProjectGroup {
  id: string;
  title: string;
  description: string;
  category: string;
  mainProject: Project;
  subProjects: Project[];
  totalBudget: number;
  createdAt: Date;
  projects: Project[]; // Alle Projekte in der Gruppe
}

const ProjectsPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const uid = params?.uid as string;
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    projectId: string;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: '',
    projectTitle: '',
  });

  // Toggle-Funktion für Accordion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Funktion zum Gruppieren von Projekten nach ähnlichen Titeln
  const groupProjectsByTheme = (projects: Project[]): ProjectGroup[] => {
    const groups: { [key: string]: Project[] } = {};

    projects.forEach(project => {
      // Extrahiere das Hauptthema aus dem Titel (z.B. "Familienfeier" aus "Familienfeier Transport")
      const titleWords = project.title.split(' ');
      let theme = titleWords[0]; // Erstes Wort als Basis

      // Suche nach gemeinsamen Themen
      if (titleWords.length > 1) {
        const commonThemes = ['Familienfeier', 'Hochzeit', 'Geburtstag', 'Firmenevent', 'Party'];
        const foundTheme = commonThemes.find(t => project.title.includes(t));
        if (foundTheme) {
          theme = foundTheme;
        }
      }

      if (!groups[theme]) {
        groups[theme] = [];
      }
      groups[theme].push(project);
    });

    // Konvertiere in ProjectGroup Array, aber nur für Gruppen mit mehr als 1 Projekt
    return Object.entries(groups)
      .filter(([_, projects]) => projects.length > 1)
      .map(([theme, groupedProjects]) => {
        const totalBudget = groupedProjects.reduce((sum, p) => sum + (p.estimatedBudget || 0), 0);
        const oldestProject = groupedProjects.reduce((oldest, p) =>
          p.createdAt < oldest.createdAt ? p : oldest
        );

        return {
          id: `group-${theme}`,
          title: `${theme} Projekt-Bundle`,
          description: `${groupedProjects.length} zusammenhängende Projekte für ${theme}`,
          category: groupedProjects[0].category,
          mainProject: groupedProjects[0],
          subProjects: groupedProjects.slice(1),
          projects: groupedProjects, // Alle Projekte in der Gruppe
          totalBudget,
          createdAt: oldestProject.createdAt,
        };
      });
  };

  // Lade Projekte aus Firestore mit Realtime Updates
  useEffect(() => {
    if (!uid || !user) return;

    // Verwende project_requests Collection als "Projekte" da dort die echten Projekte sind
    const projectRequestsRef = collection(db, 'project_requests');
    const projectRequestsQuery = query(projectRequestsRef, where('customerUid', '==', uid));

    // Realtime Subscription für sofortige Updates
    const unsubscribe = onSnapshot(
      projectRequestsQuery,
      snapshot => {

        const userProjects: Project[] = snapshot.docs.map(doc => {
          const data = doc.data();

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
                    : data.status === 'directly_assigned'
                      ? 'active' // Direkt zugewiesene Projekte als aktiv anzeigen
                      : data.status === 'active'
                        ? 'active'
                        : 'planning',
            priority:
              data.urgency === 'high' ? 'high' : data.urgency === 'medium' ? 'medium' : 'low',
            category: data.category || '',
            estimatedBudget: data.budgetAmount || data.maxBudget || 0,
            timeline: data.timeline || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt || data.createdAt || Date.now()),
            customerUid: data.customerUid || uid,
            userUid: data.userUid,
            proposalsCount: data.proposalsCount || 0,
            viewCount: data.viewCount || 0,
            isPartOfBundle: data.isPartOfBundle || false,
            bundleId: data.bundleId,
            parentBundle: data.parentBundle,
            // Neue Felder für direkte Zuweisung
            selectedProviders: data.selectedProviders || [],
            hasSelectedProviders: data.hasSelectedProviders || false,
            isDirectAssignment: data.isDirectAssignment || false,
            isPublic: data.isPublic !== false, // Default true wenn nicht explizit false
          };
        });

        setProjects(userProjects);

        // Gruppiere Projekte automatisch
        const groups = groupProjectsByTheme(userProjects);
        setProjectGroups(groups);

        setLoading(false);
      },
      error => {

        toast.error('Fehler beim Laden der Projekte');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
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
            {/* Gruppierte Projekte als Accordions */}
            {projectGroups.map(group => (
              <Card key={group.id} className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleGroupExpansion(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedGroups[group.id] ? (
                        <ChevronDown className="h-5 w-5 text-[#14ad9f]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[#14ad9f]" />
                      )}
                      <div>
                        <CardTitle className="text-lg text-[#14ad9f]">{group.title}</CardTitle>
                        <p className="text-sm text-gray-600">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                        {group.projects.length} Projekte
                      </Badge>
                      {/* Budget komplett entfernt - verursacht 0-Anzeige */}
                    </div>
                  </div>
                </CardHeader>

                {expandedGroups[group.id] && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {group.projects.map(project => (
                        <Card
                          key={project.id}
                          className="border-l-4 border-l-[#14ad9f] bg-gray-50/30"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className="border-[#14ad9f] text-[#14ad9f]"
                                  >
                                    {project.category || 'Projekt'}
                                  </Badge>
                                </div>
                                <CardTitle className="text-base text-[#14ad9f] mt-2">
                                  {project.title}
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      project.status === 'completed'
                                        ? 'default'
                                        : project.status === 'active'
                                          ? 'secondary'
                                          : 'outline'
                                    }
                                    className={
                                      project.status === 'completed'
                                        ? 'bg-green-500 text-white'
                                        : project.status === 'active'
                                          ? 'bg-[#14ad9f] text-white'
                                          : 'border-[#14ad9f] text-[#14ad9f]'
                                    }
                                  >
                                    {project.status === 'planning'
                                      ? 'Planung'
                                      : project.status === 'active'
                                        ? 'Aktiv'
                                        : project.status === 'completed'
                                          ? 'Abgeschlossen'
                                          : project.status === 'paused'
                                            ? 'Pausiert'
                                            : project.status}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeleteProject(project.id, project.title)
                                        }
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Löschen
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {project.createdAt.toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    {project.createdAt.toLocaleDateString('de-DE')}
                                  </span>
                                </div>
                                {/* Budget komplett entfernt - verursacht 0-Anzeige */}
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/user/${uid}/projects/${project.id}`}
                                  className="text-[#14ad9f] hover:text-[#129488] font-medium text-sm"
                                >
                                  Details ansehen →
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}

            {/* Einzelne Projekte die nicht gruppiert sind */}
            {projects
              .filter(
                project =>
                  !projectGroups.some(group => group.projects.some(p => p.id === project.id))
              )
              .map(project => (
                <Card
                  key={project.id}
                  className="bg-white/95 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow border-l-4 border-l-[#14ad9f]"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                            {project.category || 'Projekt'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg text-[#14ad9f] mt-2">
                          {project.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              project.status === 'completed'
                                ? 'default'
                                : project.status === 'active'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className={
                              project.status === 'completed'
                                ? 'bg-green-500 text-white'
                                : project.status === 'active'
                                  ? 'bg-[#14ad9f] text-white'
                                  : 'border-[#14ad9f] text-[#14ad9f]'
                            }
                          >
                            {project.status === 'planning'
                              ? 'Planung'
                              : project.status === 'active'
                                ? 'Aktiv'
                                : project.status === 'completed'
                                  ? 'Abgeschlossen'
                                  : project.status === 'paused'
                                    ? 'Pausiert'
                                    : project.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id, project.title)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.createdAt.toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {project.createdAt.toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {project.estimatedBudget && Number(project.estimatedBudget) > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-600">Budget:</span>
                              <span className="text-sm text-gray-600">
                                {Number(project.estimatedBudget)}€
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/user/${uid}/projects/${project.id}`}
                            className="text-[#14ad9f] hover:text-[#129488] font-medium text-sm"
                          >
                            Details ansehen →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Project Assistant Modal */}
      <ProjectAssistantModal
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        userId={uid}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={cancelDeleteProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie das Projekt &quot;{deleteDialog.projectTitle}&quot; löschen
              möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteProject}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsPage;
