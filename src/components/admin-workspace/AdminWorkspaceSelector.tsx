'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Grid, Folder, Users, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';
import { useRouter } from 'next/navigation';

interface AdminWorkspaceSelectorProps {
  adminId: string;
  onSelectWorkspace: (workspace: AdminWorkspace) => void;
}

export function AdminWorkspaceSelector({
  adminId,
  onSelectWorkspace,
}: AdminWorkspaceSelectorProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to realtime workspace updates
    const unsubscribe = adminWorkspaceService.subscribeToWorkspaces(adminId, workspaceData => {
      setWorkspaces(workspaceData);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [adminId]);

  const filteredWorkspaces = workspaces.filter(
    workspace =>
      workspace.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workspace.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'archived':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'planned':
        return 'bg-blue-100 text-blue-800 border-blue-300';
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
        return <Folder className="h-5 w-5" />;
      case 'department':
        return <Users className="h-5 w-5" />;
      case 'system':
        return <Grid className="h-5 w-5" />;
      default:
        return <Folder className="h-5 w-5" />;
    }
  };

  const handleCreateWorkspace = () => {
    router.push('/dashboard/admin/workspace/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Workspaces</h1>
            <p className="text-sm text-gray-500 mt-1">
              Wähle einen Workspace aus oder erstelle einen neuen für deine Admin-Aufgaben
            </p>
          </div>

          <Button
            onClick={handleCreateWorkspace}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Workspace
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Workspaces durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Folder className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {workspaces.length === 0 ? 'Keine Workspaces vorhanden' : 'Keine Workspaces gefunden'}
            </h3>
            <p className="text-gray-500 mb-4">
              {workspaces.length === 0
                ? 'Erstelle deinen ersten Admin-Workspace um loszulegen.'
                : 'Versuche einen anderen Suchbegriff.'}
            </p>
            {workspaces.length === 0 && (
              <Button
                onClick={handleCreateWorkspace}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ersten Workspace erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkspaces.map(workspace => (
              <Card
                key={workspace.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#14ad9f]"
                onClick={() => onSelectWorkspace(workspace)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-[#14ad9f]">{getTypeIcon(workspace.type)}</div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 line-clamp-1">
                          {workspace.title}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {workspace.type.charAt(0).toUpperCase() + workspace.type.slice(1)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            onSelectWorkspace(workspace);
                          }}
                        >
                          Workspace öffnen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/dashboard/admin/workspace/${workspace.id}/edit`);
                          }}
                        >
                          Bearbeiten
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className={getStatusColor(workspace.status)}>
                      {workspace.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(workspace.priority)}>
                      {workspace.priority}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tasks</span>
                      <span className="font-medium">{workspace.tasks?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{workspace.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#14ad9f] h-2 rounded-full transition-all"
                        style={{ width: `${workspace.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {workspace.dueDate && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Fällig: {new Date(workspace.dueDate).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
