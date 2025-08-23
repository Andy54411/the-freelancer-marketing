'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Noch keine Projekte
              </h3>
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
            {projects.map((project, index) => {
              const statusIcon = getStatusIcon(project.status);
              const priorityColor = getPriorityColor(project.priority);
              
              return (
                <Card key={project.id} className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {statusIcon}
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${priorityColor} border-current`}
                        >
                          {project.priority === 'low' ? 'Niedrig' : 
                           project.priority === 'medium' ? 'Mittel' : 'Hoch'}
                        </Badge>
                        <Badge variant="secondary">
                          {project.status === 'planning' ? 'Planung' :
                           project.status === 'active' ? 'Aktiv' :
                           project.status === 'paused' ? 'Pausiert' : 'Abgeschlossen'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm text-gray-600">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {project.timeline || 'Kein Zeitrahmen'}
                        </span>
                        {project.estimatedBudget && (
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {project.estimatedBudget.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {project.tasks.length} Aufgaben
                        </span>
                      </div>
                      <div className="text-right">
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

        {/* KI-Assistent Modal */}
        {showAssistant && (
          <ProjectAssistantModal
            isOpen={showAssistant}
            onClose={() => setShowAssistant(false)}
            userId={uid}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
