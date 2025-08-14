'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  Shield,
  Database,
  Users,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminWorkspaceBoard } from './AdminWorkspaceBoard';
import { AdminWorkspaceList } from './AdminWorkspaceList';
import { AdminWorkspaceCalendar } from './AdminWorkspaceCalendar';
import { AdminWorkspaceFilters } from './AdminWorkspaceFilters';
import { AdminQuickNoteDialog } from './AdminQuickNoteDialog';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Import types from AdminWorkspaceService
import type {
  AdminWorkspace,
  AdminWorkspaceBoardColumn,
  AdminWorkspaceTask,
} from '@/services/AdminWorkspaceService';

type ViewMode = 'board' | 'list' | 'calendar';

export default function AdminWorkspaceManager() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [selectedSystemLevel, setSelectedSystemLevel] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Admin ID (normally from auth context, using hardcoded for now)
  const adminId = 'admin-user-1';

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        const workspaceData = await adminWorkspaceService.getAdminWorkspaces();
        setWorkspaces(workspaceData);
      } catch (error) {
        console.error('Error loading admin workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  const handleCreateWorkspace = async (workspaceData: Partial<AdminWorkspace>) => {
    try {
      const newWorkspace = await adminWorkspaceService.createAdminWorkspace({
        ...workspaceData,
        adminId: adminId,
        createdBy: adminId,
        progress: 0,
        systemLevel: workspaceData.systemLevel || 'platform',
        permissions: workspaceData.permissions || {
          viewLevel: 'admin',
          editLevel: 'admin',
          deleteLevel: 'admin',
        },
      } as Omit<AdminWorkspace, 'id' | 'createdAt' | 'updatedAt'>);

      setWorkspaces(prev => [newWorkspace, ...prev]);
    } catch (error) {
      console.error('Error creating admin workspace:', error);
    }
  };

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<AdminWorkspace>) => {
    try {
      // Optimistic update
      setWorkspaces(prev =>
        prev.map(workspace =>
          workspace.id === workspaceId
            ? { ...workspace, ...updates, updatedAt: new Date() }
            : workspace
        )
      );

      await adminWorkspaceService.updateAdminWorkspace(workspaceId, updates);
    } catch (error) {
      console.error('Error updating admin workspace:', error);
      // Revert optimistic update by reloading
      const refreshedWorkspaces = await adminWorkspaceService.getAdminWorkspaces();
      setWorkspaces(refreshedWorkspaces);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await adminWorkspaceService.deleteAdminWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== workspaceId));
    } catch (error) {
      console.error('Error deleting admin workspace:', error);
    }
  };

  const handleWorkspaceClick = (workspace: AdminWorkspace) => {
    // Navigiere zur einzelnen Workspace-Ansicht statt Detail-Slider
    router.push(`/dashboard/admin/workspace/${workspace.id}`);
  };

  const handleViewWorkspace = (workspace: AdminWorkspace) => {
    router.push(`/dashboard/admin/workspace/${workspace.id}`);
  };

  const filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch =
      workspace.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workspace.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 || selectedTags.some(tag => workspace.tags.includes(tag));

    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(workspace.status);

    const matchesPriority =
      selectedPriority.length === 0 || selectedPriority.includes(workspace.priority);

    const matchesSystemLevel =
      selectedSystemLevel.length === 0 ||
      selectedSystemLevel.includes(workspace.systemLevel || 'platform');

    return matchesSearch && matchesTags && matchesStatus && matchesPriority && matchesSystemLevel;
  });

  const allTags = [...new Set(workspaces.flatMap(w => w.tags))];

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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="h-6 w-6 mr-2 text-[#14ad9f]" />
              Admin Workspace
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Verwalte Platform-Prozesse, System-Aufgaben und Admin-Projekte mit AWS-Integration
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className={viewMode === 'board' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Note Dialog */}
              <AdminQuickNoteDialog
                isOpen={false}
                onClose={() => {}}
                onAddNote={note => {
                  // Handle note addition here
                  console.log('Note added:', note);
                  adminWorkspaceService.getAdminWorkspaces().then(setWorkspaces);
                }}
                workspaceTitle="Admin Workspace"
              />

              <Link href="/dashboard/admin/workspace/create">
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Admin Workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Admin Workspaces durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter
            {selectedTags.length +
              selectedStatus.length +
              selectedPriority.length +
              selectedSystemLevel.length >
              0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length +
                  selectedStatus.length +
                  selectedPriority.length +
                  selectedSystemLevel.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active Filters */}
        {(selectedTags.length > 0 ||
          selectedStatus.length > 0 ||
          selectedPriority.length > 0 ||
          selectedSystemLevel.length > 0) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-gray-500">Aktive Filter:</span>
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer"
                onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
              >
                {tag} ×
              </Badge>
            ))}
            {selectedStatus.map(status => (
              <Badge
                key={status}
                variant="outline"
                className={`cursor-pointer ${getStatusColor(status)}`}
                onClick={() => setSelectedStatus(prev => prev.filter(s => s !== status))}
              >
                {status} ×
              </Badge>
            ))}
            {selectedPriority.map(priority => (
              <Badge
                key={priority}
                variant="outline"
                className={`cursor-pointer ${getPriorityColor(priority)}`}
                onClick={() => setSelectedPriority(prev => prev.filter(p => p !== priority))}
              >
                {priority} ×
              </Badge>
            ))}
            {selectedSystemLevel.map(systemLevel => {
              const IconComponent = getSystemLevelIcon(systemLevel);
              return (
                <Badge
                  key={systemLevel}
                  variant="outline"
                  className={`cursor-pointer ${getSystemLevelColor(systemLevel)} flex items-center gap-1`}
                  onClick={() =>
                    setSelectedSystemLevel(prev => prev.filter(s => s !== systemLevel))
                  }
                >
                  <IconComponent className="h-3 w-3" />
                  {systemLevel} ×
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTags([]);
                setSelectedStatus([]);
                setSelectedPriority([]);
                setSelectedSystemLevel([]);
              }}
              className="text-[#14ad9f] hover:text-[#129488]"
            >
              Alle Filter löschen
            </Button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {isFiltersOpen && (
        <AdminWorkspaceFilters
          allTags={allTags}
          selectedTags={selectedTags}
          selectedStatus={selectedStatus}
          selectedPriority={selectedPriority}
          selectedSystemLevel={selectedSystemLevel}
          onTagsChange={setSelectedTags}
          onStatusChange={setSelectedStatus}
          onPriorityChange={setSelectedPriority}
          onSystemLevelChange={setSelectedSystemLevel}
          onClose={() => setIsFiltersOpen(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' && (
          <AdminWorkspaceBoard
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
            adminId={adminId}
          />
        )}
        {viewMode === 'list' && (
          <AdminWorkspaceList
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        )}
        {viewMode === 'calendar' && (
          <AdminWorkspaceCalendar
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        )}
      </div>

      {/* Workspace Detail Slider - entfernt, da wir zur einzelnen Workspace-Seite navigieren */}
    </div>
  );
}
