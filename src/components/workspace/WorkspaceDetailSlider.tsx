'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  BarChart3,
  Tag,
  Edit,
  Settings,
  Plus,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Workspace, WorkspaceBoardColumn, WorkspaceTask } from '@/services/WorkspaceService';

interface WorkspaceDetailSliderProps {
  workspace: Workspace | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (workspace: Workspace) => void;
  onView?: (workspace: Workspace) => void;
  onUpdateWorkspace?: (workspaceId: string, updates: Partial<Workspace>) => void;
}

export function WorkspaceDetailSlider({
  workspace,
  isOpen,
  onClose,
  onEdit,
  onView,
  onUpdateWorkspace,
}: WorkspaceDetailSliderProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!workspace) return null;

  const formatDate = (date: Date) => {
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

  // Calculate task statistics
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
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slider */}
      <div
        className={`
        fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTypeIcon(workspace.type)}</span>
            <div>
              <h2 className="font-semibold text-gray-900 truncate">{workspace.title}</h2>
              <p className="text-sm text-gray-500">{getTypeLabel(workspace.type)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(workspace)}
                className="hover:bg-gray-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-200">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-20">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="px-4 space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold text-[#14ad9f]">{totalTasks}</div>
                    <div className="text-sm text-gray-600">Aufgaben</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                    <div className="text-sm text-gray-600">Erledigt</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold text-red-600">{urgentTasks}</div>
                    <div className="text-sm text-gray-600">Dringend</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold text-orange-600">{overdueTasks}</div>
                    <div className="text-sm text-gray-600">Überfällig</div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fortschritt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Abgeschlossen</span>
                      <span>{taskProgress}%</span>
                    </div>
                    <Progress value={taskProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Status & Priority */}
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(workspace.priority)}>
                  {getPriorityLabel(workspace.priority)}
                </Badge>
                <Badge className={getStatusColor(workspace.status)}>
                  {getStatusLabel(workspace.status)}
                </Badge>
              </div>

              {/* Description */}
              {workspace.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Beschreibung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{workspace.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Due Date */}
              {workspace.dueDate && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fälligkeitsdatum
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{formatDate(workspace.dueDate)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {workspace.tags.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {workspace.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="px-4 space-y-4">
              {/* Task Columns */}
              {columns.map(column => (
                <Card key={column.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        {column.title}
                      </CardTitle>
                      <Badge variant="outline">{column.tasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {column.tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Keine Aufgaben</p>
                    ) : (
                      column.tasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 ${
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
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-600 truncate">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {formatDate(task.dueDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {column.tasks.length > 3 && (
                      <div className="text-center">
                        <Button variant="ghost" size="sm" className="text-xs">
                          +{column.tasks.length - 3} weitere anzeigen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="details" className="px-4 space-y-4">
              {/* Metadata */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Metadaten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Erstellt am</p>
                      <p className="font-medium">{formatDate(workspace.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Aktualisiert am</p>
                      <p className="font-medium">{formatDate(workspace.updatedAt)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-gray-500 text-sm">Projekt-ID</p>
                    <p className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {workspace.id}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              {workspace.assignedTo.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team ({workspace.assignedTo.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workspace.assignedTo.map((userId, index) => (
                        <div key={userId} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{`U${index + 1}`}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700">Team Mitglied {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Aktionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-[#14ad9f] text-white hover:bg-[#129488]"
                      onClick={() => onView(workspace)}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Vollständig anzeigen
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onEdit(workspace)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Projekt bearbeiten
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Berichte anzeigen
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
