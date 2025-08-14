'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Database,
  Users,
  Activity,
  Calendar,
  Flag,
  Tag,
  User,
  MessageSquare,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';

interface AdminWorkspaceDetailSliderProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: AdminWorkspace | null;
  onUpdateWorkspace?: (workspaceId: string, updates: Partial<AdminWorkspace>) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

export function AdminWorkspaceDetailSlider({
  isOpen,
  onClose,
  workspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onTaskClick,
}: AdminWorkspaceDetailSliderProps) {
  if (!workspace) return null;

  const getSystemLevelIcon = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return Shield;
      case 'company':
        return Users;
      case 'user':
        return Activity;
      case 'system':
        return Database;
      default:
        return Activity;
    }
  };

  const getSystemLevelColor = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'company':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'system':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'backlog':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'todo':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'review':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'testing':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const IconComponent = getSystemLevelIcon(workspace.systemLevel || 'platform');
  const activeTasks = workspace.tasks?.filter(task => !task.archived) || [];
  const completedTasks = activeTasks.filter(task => task.status === 'done');
  const overdueTasks = activeTasks.filter(
    task => task.dueDate && task.dueDate < new Date() && task.status !== 'done'
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[700px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <IconComponent className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-left text-xl font-semibold text-gray-900 mb-2">
                    {workspace.title}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSystemLevelColor(workspace.systemLevel || 'platform')}>
                      {workspace.systemLevel || 'platform'}
                    </Badge>
                    <Badge className={getStatusColor(workspace.status)}>{workspace.status}</Badge>
                    <Badge className={getPriorityColor(workspace.priority)}>
                      {workspace.priority}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{workspace.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Progress and Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Fortschritt</span>
                      <span className="text-sm text-gray-500">{workspace.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#14ad9f] h-2 rounded-full transition-all"
                        style={{ width: `${workspace.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{completedTasks.length} abgeschlossen</span>
                      <span>{activeTasks.length} gesamt</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Aktive Tasks</span>
                        <span className="text-sm font-medium">{activeTasks.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Überfällig</span>
                        <span className="text-sm font-medium text-red-600">
                          {overdueTasks.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Team-Mitglieder</span>
                        <span className="text-sm font-medium">{workspace.assignedTo.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workspace Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Workspace Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Typ</label>
                    <p className="text-sm text-gray-600 capitalize">{workspace.type}</p>
                  </div>

                  {workspace.dueDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Fälligkeitsdatum
                      </label>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {workspace.dueDate.toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Erstellt von
                    </label>
                    <p className="text-sm text-gray-600">{workspace.createdBy}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Erstellt am
                    </label>
                    <p className="text-sm text-gray-600">
                      {workspace.createdAt.toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {workspace.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {workspace.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Companies */}
                {workspace.relatedCompanies && workspace.relatedCompanies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Betroffene Unternehmen
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {workspace.relatedCompanies.map(companyId => (
                        <Badge
                          key={companyId}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700"
                        >
                          Company {companyId.slice(-6)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {workspace.assignedTo.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Team-Mitglieder
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {workspace.assignedTo.map(member => (
                        <div
                          key={member}
                          className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-[#14ad9f] text-white text-xs">
                              {member.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Aktuelle Tasks</h3>
                  {activeTasks.length > 5 && (
                    <Button variant="ghost" size="sm">
                      Alle anzeigen
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                {activeTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Keine aktiven Tasks</h4>
                    <p className="text-gray-500">Erstelle deine erste Task, um zu beginnen.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTasks.slice(0, 5).map(task => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onTaskClick?.(task.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 truncate">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {task.dueDate.toLocaleDateString('de-DE')}
                                  </div>
                                )}
                                {task.estimatedHours && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.estimatedHours}h
                                  </div>
                                )}
                                {task.assignedTo.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {task.assignedTo[0]}
                                  </div>
                                )}
                                {task.comments && task.comments.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {task.comments.length}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 ml-4">
                              <div className="flex items-center gap-1">
                                <Badge className={getTaskStatusColor(task.status)}>
                                  {task.status}
                                </Badge>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </div>

                              {task.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {task.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {task.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{task.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t border-gray-200 pt-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Workspace ID: {workspace.id}</div>
                  <div>Admin ID: {workspace.adminId}</div>
                  <div>
                    Zuletzt aktualisiert: {workspace.updatedAt.toLocaleDateString('de-DE')} um{' '}
                    {workspace.updatedAt.toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(workspace.status)}>{workspace.status}</Badge>
                <Badge className={getPriorityColor(workspace.priority)}>{workspace.priority}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteWorkspace?.(workspace.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Löschen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
