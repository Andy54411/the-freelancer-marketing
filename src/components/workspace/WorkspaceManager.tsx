'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Grid, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WorkspaceBoard } from './WorkspaceBoard';
import { WorkspaceList } from './WorkspaceList';
import { WorkspaceCalendar } from './WorkspaceCalendar';
import { WorkspaceFilters } from './WorkspaceFilters';
import { WorkspaceDetailSlider } from './WorkspaceDetailSlider';
import { WorkspaceService } from '@/services/WorkspaceService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QuickNoteDialog } from './QuickNoteDialog';

// Import types from WorkspaceService (remove local duplicates)
import type { Workspace, WorkspaceBoardColumn, WorkspaceTask } from '@/services/WorkspaceService';

type ViewMode = 'board' | 'list' | 'calendar';

export default function WorkspaceManager() {
  const { user } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isDetailSliderOpen, setIsDetailSliderOpen] = useState(false);

  // Company ID aus URL-Parametern oder User UID verwenden
  const companyId = user?.uid;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSync = async () => {
      if (!companyId) return;

      try {
        setLoading(true);

        // Setup real-time listener for workspaces
        unsubscribe = WorkspaceService.subscribeToWorkspaces(companyId, workspaceData => {
          setWorkspaces(workspaceData);
          setLoading(false);
        });
      } catch (error) {

        setLoading(false);
      }
    };

    setupRealtimeSync();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [companyId]);

  const handleCreateWorkspace = async (workspaceData: Partial<Workspace>) => {
    if (!companyId || !user?.uid) return;

    try {
      const newWorkspace = await WorkspaceService.createWorkspace({
        ...workspaceData,
        companyId: companyId,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
      } as Workspace);

      setWorkspaces(prev => [newWorkspace, ...prev]);
      // Modal wurde entfernt, da wir jetzt eine separate Seite verwenden
    } catch (error) {

    }
  };

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    try {
      // Optimistic update - update local state immediately
      setWorkspaces(prev =>
        prev.map(workspace =>
          workspace.id === workspaceId
            ? { ...workspace, ...updates, updatedAt: new Date() }
            : workspace
        )
      );

      // Update in Realtime Database - real-time listener will sync automatically
      await WorkspaceService.updateWorkspace(workspaceId, updates);
    } catch (error) {

      // Revert optimistic update on error by re-triggering realtime sync
      // The subscription will automatically refresh the data
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await WorkspaceService.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== workspaceId));
    } catch (error) {

    }
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setIsDetailSliderOpen(true);
  };

  const handleCloseDetailSlider = () => {
    setIsDetailSliderOpen(false);
    setSelectedWorkspace(null);
  };

  const handleEditWorkspace = (workspace: Workspace) => {
    // Navigate to edit page
    router.push(`/dashboard/company/${companyId}/workspace/${workspace.id}/edit`);
  };

  const handleViewWorkspace = (workspace: Workspace) => {
    // Navigate to workspace detail view
    router.push(`/dashboard/company/${companyId}/workspace/${workspace.id}`);
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

    return matchesSearch && matchesTags && matchesStatus && matchesPriority;
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
              {companyId && user?.uid && (
                <QuickNoteDialog
                  workspaces={filteredWorkspaces}
                  companyId={companyId}
                  userId={user.uid}
                  onNoteAdded={() => {
                    // Realtime sync will automatically update the UI
                  }}
                />
              )}

              <Link href={`/dashboard/company/${companyId}/workspace/create`}>
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Workspace
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
        <WorkspaceFilters
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
          <WorkspaceBoard
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
            companyId={companyId}
          />
        )}
        {viewMode === 'list' && (
          <WorkspaceList
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        )}
        {viewMode === 'calendar' && (
          <WorkspaceCalendar
            workspaces={filteredWorkspaces}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        )}
      </div>

      {/* Workspace Detail Slider */}
      <WorkspaceDetailSlider
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
