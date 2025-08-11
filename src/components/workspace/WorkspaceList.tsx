'use client';

import React, { useState } from 'react';
import { Calendar, User, Tag, Clock, MoreHorizontal, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Workspace } from '@/services/WorkspaceService';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onWorkspaceClick?: (workspace: Workspace) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'progress';
type SortDirection = 'asc' | 'desc';

export function WorkspaceList({
  workspaces,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onWorkspaceClick,
}: WorkspaceListProps) {
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'dueDate' || sortField === 'createdAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (sortField === 'priority') {
      const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
      aValue = priorityOrder[aValue as keyof typeof priorityOrder];
      bValue = priorityOrder[bValue as keyof typeof priorityOrder];
    }

    if (sortField === 'status') {
      const statusOrder = { active: 1, paused: 2, completed: 3, archived: 4 };
      aValue = statusOrder[aValue as keyof typeof statusOrder];
      bValue = statusOrder[bValue as keyof typeof statusOrder];
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectWorkspace = (workspaceId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkspaces(prev => [...prev, workspaceId]);
    } else {
      setSelectedWorkspaces(prev => prev.filter(id => id !== workspaceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWorkspaces(workspaces.map(w => w.id));
    } else {
      setSelectedWorkspaces([]);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '📁';
      case 'task':
        return '✅';
      case 'document':
        return '📄';
      case 'process':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isOverdue = (dueDate?: Date) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Workspaces gefunden</h3>
          <p className="text-gray-500">Erstelle deinen ersten Workspace um zu beginnen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* List Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">{workspaces.length} Workspaces</h3>
            {selectedWorkspaces.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedWorkspaces.length} ausgewählt</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedWorkspaces.forEach(id => onDeleteWorkspace(id));
                    setSelectedWorkspaces([]);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Löschen
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedWorkspaces.length === workspaces.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12">Typ</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-2 font-medium"
                >
                  Titel
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 font-medium"
                >
                  Status
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('priority')}
                  className="flex items-center gap-2 font-medium"
                >
                  Priorität
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('progress')}
                  className="flex items-center gap-2 font-medium"
                >
                  Fortschritt
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Zugewiesen</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('dueDate')}
                  className="flex items-center gap-2 font-medium"
                >
                  Fälligkeitsdatum
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-2 font-medium"
                >
                  Erstellt
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkspaces.map(workspace => (
              <TableRow
                key={workspace.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedWorkspaces.includes(workspace.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => onWorkspaceClick?.(workspace)}
              >
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedWorkspaces.includes(workspace.id)}
                    onCheckedChange={checked =>
                      handleSelectWorkspace(workspace.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <span className="text-lg">{getTypeIcon(workspace.type)}</span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{workspace.title}</div>
                    {workspace.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {workspace.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(workspace.status)}>
                    {workspace.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(workspace.priority)}>
                    {workspace.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#14ad9f] h-2 rounded-full"
                        style={{ width: `${workspace.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{workspace.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {workspace.assignedTo.slice(0, 3).map((userId, index) => (
                      <Avatar key={userId} className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {userId.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {workspace.assignedTo.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        +{workspace.assignedTo.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {workspace.dueDate ? (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        isOverdue(workspace.dueDate) ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      {formatDate(workspace.dueDate)}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {workspace.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {workspace.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{workspace.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-500">{formatDate(workspace.createdAt)}</div>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem>Duplizieren</DropdownMenuItem>
                      <DropdownMenuItem>Archivieren</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteWorkspace(workspace.id)}
                      >
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
