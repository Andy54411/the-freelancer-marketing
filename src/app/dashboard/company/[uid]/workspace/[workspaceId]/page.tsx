'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Users,
  Tag,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceService } from '@/services/WorkspaceService';
import type { Workspace, WorkspaceBoardColumn, WorkspaceTask } from '@/services/WorkspaceService';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceBoard } from '@/components/workspace/WorkspaceBoard';

export default function WorkspaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const workspaceId = params.workspaceId as string;
  const companyId = params.uid as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!workspaceId) return;

      try {
        setLoading(true);
        const workspaceData = await WorkspaceService.getWorkspaceById(workspaceId);

        if (!workspaceData) {
          router.push(`/dashboard/company/${companyId}/workspace`);
          return;
        }

        setWorkspace(workspaceData);
      } catch (error) {
        router.push(`/dashboard/company/${companyId}/workspace`);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [workspaceId, companyId, router]);

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    try {
      await WorkspaceService.updateWorkspace(workspaceId, updates);
      // Reload workspace data
      const updatedWorkspace = await WorkspaceService.getWorkspaceById(workspaceId);
      if (updatedWorkspace) {
        setWorkspace(updatedWorkspace);
      }
    } catch (error) {}
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Möchtest du dieses Workspace wirklich löschen?')) return;

    try {
      await WorkspaceService.deleteWorkspace(workspaceId);
      router.push(`/dashboard/company/${companyId}/workspace`);
    } catch (error) {}
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '🚀';
      case 'task':
        return '✅';
      case 'document':
        return '📄';
      case 'process':
        return '⚙️';
      default:
        return '📁';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Dringend';
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Normal';
      case 'low':
        return 'Niedrig';
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Abgeschlossen';
      case 'paused':
        return 'Pausiert';
      case 'archived':
        return 'Archiviert';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projekt';
      case 'task':
        return 'Aufgabe';
      case 'document':
        return 'Dokument';
      case 'process':
        return 'Prozess';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Workspace nicht gefunden</h3>
          <p className="text-gray-500 mb-4">
            Das gewünschte Workspace konnte nicht geladen werden.
          </p>
          <Button onClick={() => router.push(`/dashboard/company/${companyId}/workspace`)}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const columns = workspace.boardColumns || [];
  const allTasks = columns.flatMap(col => col.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(
    task => task.status === 'done' || task.status === 'completed'
  ).length;
  const urgentTasks = allTasks.filter(task => task.priority === 'urgent').length;
  const overdueTasks = allTasks.filter(
    task =>
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== 'done' &&
      task.status !== 'completed'
  ).length;

  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/company/${companyId}/workspace`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(workspace.type)}</span>
                {workspace.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {getTypeLabel(workspace.type)} • Erstellt am {formatDateShort(workspace.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/dashboard/company/${companyId}/workspace/${workspaceId}/edit`)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteWorkspace(workspace.id)}
                  className="text-red-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() =>
                router.push(`/dashboard/company/${companyId}/workspace/${workspaceId}/edit`)
              }
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 mt-4">
          <Badge className={getPriorityColor(workspace.priority)}>
            {getPriorityLabel(workspace.priority)}
          </Badge>
          <Badge className={getStatusColor(workspace.status)}>
            {getStatusLabel(workspace.status)}
          </Badge>
          {workspace.dueDate && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Fällig: {formatDateShort(workspace.dueDate)}
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            {taskProgress}% abgeschlossen
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                      <p className="text-sm text-gray-600">Gesamt Aufgaben</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                      <p className="text-sm text-gray-600">Abgeschlossen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{urgentTasks}</p>
                      <p className="text-sm text-gray-600">Dringend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{overdueTasks}</p>
                      <p className="text-sm text-gray-600">Überfällig</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Projekt-Fortschritt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Abgeschlossen</span>
                    <span>{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Verbleibende Aufgaben</p>
                      <p className="font-semibold">{totalTasks - completedTasks}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Geschätzte Fertigstellung</p>
                      <p className="font-semibold">
                        {workspace.dueDate
                          ? formatDateShort(workspace.dueDate)
                          : 'Nicht festgelegt'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {workspace.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Beschreibung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{workspace.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Tags & Team */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tags */}
              {workspace.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {workspace.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team */}
              {workspace.assignedTo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team ({workspace.assignedTo.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workspace.assignedTo.map((userId, index) => (
                        <div key={userId} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{`U${index + 1}`}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">Team Mitglied {index + 1}</p>
                            <p className="text-xs text-gray-500">{userId.slice(0, 8)}...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <WorkspaceBoard
                  workspaces={[workspace]}
                  onUpdateWorkspace={handleUpdateWorkspace}
                  onDeleteWorkspace={handleDeleteWorkspace}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            {/* Task Overview */}
            <div className="space-y-6">
              {columns.map(column => (
                <Card key={column.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        {column.title}
                      </CardTitle>
                      <Badge variant="outline">{column.tasks.length} Aufgaben</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {column.tasks.length === 0 ? (
                      <p className="text-gray-500 italic">Keine Aufgaben in dieser Spalte</p>
                    ) : (
                      <div className="space-y-3">
                        {column.tasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div
                              className={`w-3 h-3 rounded-full mt-1 ${
                                task.priority === 'urgent'
                                  ? 'bg-red-500'
                                  : task.priority === 'high'
                                    ? 'bg-orange-500'
                                    : task.priority === 'medium'
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateShort(task.dueDate)}
                                  </span>
                                )}
                                {task.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {task.tags.slice(0, 2).map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <div className="space-y-6">
              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Metadaten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Workspace-ID</p>
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {workspace.id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Typ</p>
                        <p className="font-medium">{getTypeLabel(workspace.type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge className={getStatusColor(workspace.status)}>
                          {getStatusLabel(workspace.status)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Priorität</p>
                        <Badge className={getPriorityColor(workspace.priority)}>
                          {getPriorityLabel(workspace.priority)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Erstellt am</p>
                        <p className="font-medium">{formatDate(workspace.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Zuletzt aktualisiert</p>
                        <p className="font-medium">{formatDate(workspace.updatedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Erstellt von</p>
                        <p className="font-medium">{workspace.createdBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fortschritt</p>
                        <p className="font-medium">{workspace.progress}%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Aktionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      router.push(`/dashboard/company/${companyId}/workspace/${workspaceId}/edit`)
                    }
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Workspace bearbeiten
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Berichte anzeigen
                  </Button>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteWorkspace(workspace.id)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Workspace löschen
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
