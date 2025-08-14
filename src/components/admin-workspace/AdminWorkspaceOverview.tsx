'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminWorkspaceSelector } from '@/components/admin-workspace/AdminWorkspaceSelector';
import { AdminWorkspaceBoard } from '@/components/admin-workspace/AdminWorkspaceBoard';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';

interface AdminUser {
  email: string;
  name: string;
  role: string;
  id: string;
}

export default function AdminWorkspaceOverview() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Authentication Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setAdminUser({
            email: data.user.email,
            name: data.user.name || data.user.email,
            role: data.user.role || 'admin',
            id: data.user.email,
          });
        } else {
          // Redirect to admin login if not authenticated
          window.location.href = '/admin/login';
          return;
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        window.location.href = '/admin/login';
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const adminId = adminUser?.email;

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

  const handleSelectWorkspace = async (workspace: AdminWorkspace) => {
    try {
      // Load workspace with tasks
      const workspaceWithTasks = await adminWorkspaceService.getWorkspace(workspace.id);
      setSelectedWorkspace(workspaceWithTasks);
    } catch (error) {
      console.error('Error loading workspace:', error);
      // Fallback to basic workspace if detailed loading fails
      setSelectedWorkspace(workspace);
    }
  };

  const handleBackToSelector = () => {
    setSelectedWorkspace(null);
  };

  const handleUpdateWorkspace = async (workspaceId: string, updates: Partial<AdminWorkspace>) => {
    try {
      // Update in backend
      await adminWorkspaceService.updateWorkspace(workspaceId, updates);

      // Update local state
      setWorkspaces(prev =>
        prev.map(workspace =>
          workspace.id === workspaceId
            ? { ...workspace, ...updates, updatedAt: new Date() }
            : workspace
        )
      );

      // Update selected workspace if it's the one being updated
      if (selectedWorkspace?.id === workspaceId) {
        setSelectedWorkspace(prev =>
          prev ? { ...prev, ...updates, updatedAt: new Date() } : null
        );
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await adminWorkspaceService.deleteWorkspace(workspaceId);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== workspaceId));

      // If currently selected workspace is deleted, go back to selector
      if (selectedWorkspace?.id === workspaceId) {
        setSelectedWorkspace(null);
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!adminId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Zugriff verweigert</h3>
        <p className="text-gray-500">
          Du musst als Admin angemeldet sein, um auf die Workspaces zuzugreifen.
        </p>
      </div>
    );
  }

  // Show workspace board if a workspace is selected
  if (selectedWorkspace) {
    return (
      <div className="h-full flex flex-col">
        {/* Back Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSelector}
              className="text-[#14ad9f] hover:text-[#129488] hover:bg-[#14ad9f]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Workspace-Auswahl
            </Button>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <h2 className="font-semibold text-gray-900">{selectedWorkspace.title}</h2>
              <p className="text-sm text-gray-500">{selectedWorkspace.description}</p>
            </div>
          </div>
        </div>

        {/* Workspace Board */}
        <div className="flex-1">
          <AdminWorkspaceBoard
            workspaces={[selectedWorkspace]}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            adminId={adminId}
          />
        </div>
      </div>
    );
  }

  // Show workspace selector
  return <AdminWorkspaceSelector adminId={adminId} onSelectWorkspace={handleSelectWorkspace} />;
}
