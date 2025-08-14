'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Database,
  Users,
  Activity,
  Calendar,
  User,
  Tag,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';

interface AdminWorkspaceListProps {
  workspaces: AdminWorkspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<AdminWorkspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onWorkspaceClick?: (workspace: AdminWorkspace) => void;
}

export function AdminWorkspaceList({
  workspaces,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onWorkspaceClick,
}: AdminWorkspaceListProps) {
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'dueDate' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'dueDate':
        aValue = a.dueDate ? a.dueDate.getTime() : 0;
        bValue = b.dueDate ? b.dueDate.getTime() : 0;
        break;
      case 'updatedAt':
        aValue = a.updatedAt.getTime();
        bValue = b.updatedAt.getTime();
        break;
      default:
        aValue = a.updatedAt.getTime();
        bValue = b.updatedAt.getTime();
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (workspaces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Admin Workspaces</h3>
          <p className="text-gray-500">Erstelle deinen ersten Admin Workspace, um zu beginnen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* List Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            {workspaces.length} Admin Workspace{workspaces.length !== 1 ? 's' : ''}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('title')}
              className={sortBy === 'title' ? 'bg-gray-100' : ''}
            >
              Name {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('priority')}
              className={sortBy === 'priority' ? 'bg-gray-100' : ''}
            >
              Priorität {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('updatedAt')}
              className={sortBy === 'updatedAt' ? 'bg-gray-100' : ''}
            >
              Aktualisiert {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {sortedWorkspaces.map(workspace => {
            const IconComponent = getSystemLevelIcon(workspace.systemLevel || 'platform');
            const activeTasks = workspace.tasks?.filter(task => !task.archived).length || 0;
            const completedTasks =
              workspace.tasks?.filter(task => task.status === 'done' && !task.archived).length || 0;

            return (
              <Card
                key={workspace.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onWorkspaceClick?.(workspace)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-[#14ad9f]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {workspace.title}
                          </h3>
                          <Badge
                            className={getSystemLevelColor(workspace.systemLevel || 'platform')}
                          >
                            {workspace.systemLevel || 'platform'}
                          </Badge>
                        </div>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {workspace.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {workspace.dueDate
                                ? workspace.dueDate.toLocaleDateString('de-DE')
                                : 'Kein Termin'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{workspace.assignedTo.length} Zugewiesen</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>{activeTasks} Tasks</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 ml-4">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(workspace.status)}>
                            {workspace.status}
                          </Badge>
                          <Badge className={getPriorityColor(workspace.priority)}>
                            {workspace.priority}
                          </Badge>
                        </div>

                        <div className="text-xs text-gray-500">
                          {completedTasks}/{activeTasks} abgeschlossen
                        </div>

                        {workspace.progress > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[#14ad9f] h-2 rounded-full"
                                style={{ width: `${workspace.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{workspace.progress}%</span>
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Anzeigen
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem>Duplizieren</DropdownMenuItem>
                          <DropdownMenuItem>
                            {workspace.status === 'archived' ? 'Wiederherstellen' : 'Archivieren'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteWorkspace(workspace.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Tags */}
                  {workspace.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      {workspace.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {workspace.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{workspace.tags.length - 3} weitere
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Related Companies */}
                  {workspace.relatedCompanies && workspace.relatedCompanies.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Betrifft:</span>
                      {workspace.relatedCompanies.slice(0, 2).map(companyId => (
                        <Badge
                          key={companyId}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700"
                        >
                          Company {companyId.slice(-4)}
                        </Badge>
                      ))}
                      {workspace.relatedCompanies.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{workspace.relatedCompanies.length - 2} weitere
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
