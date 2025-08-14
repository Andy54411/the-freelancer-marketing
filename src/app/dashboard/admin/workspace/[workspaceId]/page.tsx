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
  Shield,
  Database,
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
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import type {
  AdminWorkspace,
  AdminWorkspaceBoardColumn,
  AdminWorkspaceTask,
} from '@/services/AdminWorkspaceService';
import { SingleAdminWorkspaceBoard } from '@/components/workspace/SingleAdminWorkspaceBoard';

export default function AdminWorkspaceDetailPage() {
  const router = useRouter();
  const params = useParams();

  const workspaceId = params.workspaceId as string;

  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setLoading(true);
        console.log('DEBUG: Loading workspace', workspaceId);
        const workspaceData = await adminWorkspaceService.getAdminWorkspace(workspaceId);
        console.log('DEBUG: Loaded workspace data:', workspaceData);
        console.log('DEBUG: Workspace tasks count:', workspaceData?.tasks?.length);
        setWorkspace(workspaceData);
      } catch (error) {
        console.error('Error loading admin workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId]);

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<AdminWorkspace>) => {
    try {
      await adminWorkspaceService.updateAdminWorkspace(workspaceId, updates);
      // Reload workspace
      const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(workspaceId);
      setWorkspace(refreshedWorkspace);
    } catch (error) {
      console.error('Error updating admin workspace:', error);
    }
  };

  const getSystemLevelIcon = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return Shield;
      case 'company':
        return Users;
      case 'user':
        return Users;
      case 'system':
        return Database;
      default:
        return Shield;
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-500">Admin Workspace wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Workspace nicht gefunden</h3>
          <p className="text-gray-500 mb-4">
            Das angeforderte Admin Workspace konnte nicht geladen werden.
          </p>
          <Button
            onClick={() => router.push('/dashboard/admin/workspace')}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zu Admin Workspaces
          </Button>
        </div>
      </div>
    );
  }

  const SystemLevelIcon = getSystemLevelIcon(workspace.systemLevel || 'platform');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/admin/workspace')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin Workspaces
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <SystemLevelIcon className="h-6 w-6 text-[#14ad9f]" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{workspace.title}</h1>
                  <p className="text-sm text-gray-500">{workspace.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getSystemLevelColor(workspace.systemLevel || 'platform')}>
                {workspace.systemLevel || 'platform'}
              </Badge>
              <Badge className={getPriorityColor(workspace.priority)}>{workspace.priority}</Badge>
              <Badge variant="outline">
                {workspace.tasks?.filter(t => !t.archived).length || 0} Tasks
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="board">Task Board</TabsTrigger>
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="board" className="flex-1 overflow-hidden m-0 p-0">
            <SingleAdminWorkspaceBoard workspace={workspace} onWorkspaceUpdate={setWorkspace} />
          </TabsContent>

          <TabsContent value="overview" className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Workspace Info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SystemLevelIcon className="h-5 w-5" />
                    Workspace Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Beschreibung</h4>
                    <p className="text-gray-600">{workspace.description || 'Keine Beschreibung'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">System Level</h4>
                      <Badge className={getSystemLevelColor(workspace.systemLevel || 'platform')}>
                        {workspace.systemLevel || 'platform'}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Priorität</h4>
                      <Badge className={getPriorityColor(workspace.priority)}>
                        {workspace.priority}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                      <Badge variant="outline">{workspace.status}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Fortschritt</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={workspace.progress} className="flex-1" />
                        <span className="text-sm text-gray-600">{workspace.progress}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-semibold text-gray-900">
                          {workspace.tasks?.filter(t => t.status === 'done' && !t.archived)
                            .length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Abgeschlossen</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-semibold text-gray-900">
                          {workspace.tasks?.filter(t => t.status === 'in-progress' && !t.archived)
                            .length || 0}
                        </p>
                        <p className="text-sm text-gray-600">In Bearbeitung</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-semibold text-gray-900">
                          {workspace.tasks?.filter(t => t.priority === 'urgent' && !t.archived)
                            .length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Dringend</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Analytics werden entwickelt
              </h3>
              <p className="text-gray-500">
                Detaillierte Analysen und Berichte für dieses Admin Workspace kommen bald.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
