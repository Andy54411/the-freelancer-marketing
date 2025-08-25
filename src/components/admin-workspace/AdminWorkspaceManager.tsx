'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Grid, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminWorkspaceBoard } from './AdminWorkspaceBoard';
import { AdminWorkspaceList } from './AdminWorkspaceList';
import { AdminWorkspaceCalendar } from './AdminWorkspaceCalendar';
import { AdminWorkspaceFilters } from './AdminWorkspaceFilters';
import { AdminWorkspaceDetailSlider } from './AdminWorkspaceDetailSlider';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminQuickNoteDialog } from './AdminQuickNoteDialog';

// Import types from AdminWorkspaceService
import type {
  AdminWorkspace,
  AdminWorkspaceBoardColumn,
  AdminWorkspaceTask,
} from '@/services/AdminWorkspaceService';

type ViewMode = 'board' | 'list' | 'calendar';

interface AdminUser {
  email: string;
  name: string;
  role: string;
  id: string;
}

export default function AdminWorkspaceManager() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(null);
  const [isDetailSliderOpen, setIsDetailSliderOpen] = useState(false);

  // Admin Authentication Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify');
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.user);
        } else {
          router.push('/admin/login');
          return;
        }
      } catch (error) {

        router.push('/admin/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Admin ID aus Admin User verwenden
  const adminId = adminUser?.id;

  useEffect(() => {
    if (!adminId || authLoading) {
      // User noch nicht geladen oder nicht authentifiziert
      setLoading(authLoading);
      if (!authLoading && !adminId) {
        setWorkspaces([]);
      }
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
  }, [adminId, authLoading]);

  const handleCreateWorkspace = async (workspaceData: Partial<AdminWorkspace>) => {
    if (!adminId || !adminUser?.id) return;

    try {
      const newWorkspace = await adminWorkspaceService.createWorkspace({
        ...workspaceData,
        adminId: adminId,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
      } as AdminWorkspace);

      setWorkspaces(prev => [newWorkspace, ...prev]);
      // Modal wurde entfernt, da wir jetzt eine separate Seite verwenden
    } catch (error) {

    }
  };

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<AdminWorkspace>) => {
    try {
      // Use realtime update method that updates and notifies subscribers
      await adminWorkspaceService.updateWorkspaceWithRealtime(workspaceId, updates);
      // State will be updated automatically through realtime subscription
    } catch (error) {

      // Revert optimistic update on error by reloading
      if (adminId) {
        const workspaceData = await adminWorkspaceService.getWorkspacesByAdmin(adminId);
        setWorkspaces(workspaceData);
      }
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await adminWorkspaceService.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== workspaceId));
    } catch (error) {

    }
  };

  const handleWorkspaceClick = (workspace: AdminWorkspace) => {
    setSelectedWorkspace(workspace);
    setIsDetailSliderOpen(true);
  };

  const handleCloseDetailSlider = () => {
    setIsDetailSliderOpen(false);
    setSelectedWorkspace(null);
  };

  const handleEditWorkspace = (workspace: AdminWorkspace) => {
    // Navigate to edit page
    router.push(`/dashboard/admin/workspace/${workspace.id}/edit`);
  };

  const handleViewWorkspace = (workspace: AdminWorkspace) => {
    // Navigate to workspace detail view
    router.push(`/dashboard/admin/workspace/${workspace.id}`);
  };

  const filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch =
      workspace.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workspace.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 || selectedTags.some(tag => workspace.tags?.includes(tag));

    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(workspace.status);

    const matchesPriority =
      selectedPriority.length === 0 || selectedPriority.includes(workspace.priority);

    return matchesSearch && matchesTags && matchesStatus && matchesPriority;
  });

  const allTags = [...new Set(workspaces.flatMap(w => w.tags || []))];

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

  // Frühe Authentifizierungs-Überprüfung
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Nicht authentifiziert</div>
          <Link href="/admin/login" className="text-[#14ad9f] hover:underline">
            Zum Admin-Login
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
            <p className="text-sm text-gray-500 mt-1">
              Verwalte Projekte, Aufgaben und Prozesse in einer übersichtlichen Workspace-Umgebung
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
              {adminId && adminUser?.id && (
                <AdminQuickNoteDialog
                  workspaces={filteredWorkspaces}
                  adminId={adminId}
                  userId={adminUser.id}
                  onNoteAdded={() => {
                    // Realtime sync will automatically update the UI
                  }}
                />
              )}

              <Link href={`/dashboard/admin/workspace/create`}>
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
              placeholder="Workspaces durchsuchen..."
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
            {selectedTags.length + selectedStatus.length + selectedPriority.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length + selectedStatus.length + selectedPriority.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active Filters */}
        {(selectedTags.length > 0 || selectedStatus.length > 0 || selectedPriority.length > 0) && (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTags([]);
                setSelectedStatus([]);
                setSelectedPriority([]);
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
          onTagsChange={setSelectedTags}
          onStatusChange={setSelectedStatus}
          onPriorityChange={setSelectedPriority}
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
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        )}
      </div>

      {/* Workspace Detail Slider */}
      <AdminWorkspaceDetailSlider
        workspace={selectedWorkspace}
        isOpen={isDetailSliderOpen}
        onClose={handleCloseDetailSlider}
        onEdit={handleEditWorkspace}
        onView={handleViewWorkspace}
        onUpdateWorkspace={handleUpdateWorkspace}
      />
    </div>
  );
}
