import {
  ref,
  push,
  update,
  remove,
  onValue,
  off,
} from 'firebase/database';
import { realtimeDb as database } from '@/firebase/clients';

export interface WorkspaceMember {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
}

export interface Workspace {
  id: string;
  title: string;
  description: string;
  type: 'project' | 'task' | 'document' | 'process';
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  companyId: string;
  createdBy: string;
  progress: number;
  boardColumns?: WorkspaceBoardColumn[];
  tasks?: WorkspaceTask[];
  archivedTasks?: WorkspaceTask[];
  members?: WorkspaceMember[];
  columns?: string[];
}

export interface WorkspaceBoardColumn {
  id: string;
  title: string;
  color: string;
  position: number;
  tasks: WorkspaceTask[];
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
  position: number;
  columnId?: string;
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
  content?: string;
  coverImage?: string;
  contentTitle?: string;
  contentTitleLevel?: 1 | 2 | 3 | 4;
}

class WorkspaceServiceClass {
  private collectionName = 'workspaces';

  // Get all workspaces for a company
  async getWorkspaces(companyId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = ref(database, this.collectionName);

      return new Promise((resolve, reject) => {
        onValue(
          workspacesRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve([]);
              return;
            }

            const workspaces: Workspace[] = Object.entries(data)
              .map(([id, workspace]: [string, any]) => ({
                id,
                ...workspace,
                createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
                updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
                dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
              }))
              .filter(workspace => workspace.companyId === companyId)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            resolve(workspaces);
          },
          _error => {
            reject(new Error('Failed to get workspaces'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get workspaces');
    }
  }

  // Helper function to clean data for Firebase
  private cleanDataForFirebase(data: any): any {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          cleaned[key] = value.getTime();
        } else if (Array.isArray(value)) {
          cleaned[key] = value.map(item =>
            typeof item === 'object' && item !== null ? this.cleanDataForFirebase(item) : item
          );
        } else if (typeof value === 'object' && value !== null) {
          cleaned[key] = this.cleanDataForFirebase(value);
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  }

  // Create a new workspace
  async createWorkspace(workspace: Omit<Workspace, 'id'>): Promise<Workspace> {
    try {
      const workspacesRef = ref(database, this.collectionName);

      // Clean the workspace data and prepare for Firebase
      const workspaceData = this.cleanDataForFirebase({
        ...workspace,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        dueDate: workspace.dueDate?.getTime() || null,
        boardColumns: workspace.boardColumns || this.getDefaultBoardColumns(),
        tasks: workspace.tasks || [],
        archivedTasks: workspace.archivedTasks || [],
        members: workspace.members || [],
      });

      // Use push to auto-generate ID and set data in one operation
      const newWorkspaceRef = push(workspacesRef, workspaceData);
      const workspaceId = newWorkspaceRef.key!;

      // Return the new workspace with proper date objects
      return {
        id: workspaceId,
        ...workspace,
        createdAt: new Date(),
        updatedAt: new Date(),
        boardColumns: workspace.boardColumns || this.getDefaultBoardColumns(),
        tasks: workspace.tasks || [],
        archivedTasks: workspace.archivedTasks || [],
        members: workspace.members || [],
      };
    } catch {
      throw new Error('Failed to create workspace');
    }
  }

  // Update a workspace
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<void> {
    try {
      const workspaceRef = ref(database, `${this.collectionName}/${workspaceId}`);

      // Prepare update data with cleaned values
      const updateData = this.cleanDataForFirebase({
        ...updates,
        updatedAt: Date.now(),
      });

      await update(workspaceRef, updateData);
    } catch {
      throw new Error('Failed to update workspace');
    }
  }

  // Delete a workspace
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspaceRef = ref(database, `${this.collectionName}/${workspaceId}`);
      await remove(workspaceRef);
    } catch {
      throw new Error('Failed to delete workspace');
    }
  }

  // Get workspace by ID
  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    try {
      const workspaceRef = ref(database, `${this.collectionName}/${workspaceId}`);

      return new Promise((resolve, reject) => {
        onValue(
          workspaceRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve(null);
              return;
            }

            const workspace: Workspace = {
              id: workspaceId,
              ...data,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
              dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            };

            resolve(workspace);
          },
          _error => {
            reject(new Error('Failed to get workspace'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get workspace');
    }
  }

  // Subscribe to workspace changes
  subscribeToWorkspaces(
    companyId: string,
    callback: (workspaces: Workspace[]) => void
  ): () => void {
    const workspacesRef = ref(database, this.collectionName);

    const unsubscribe = onValue(workspacesRef, snapshot => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }

      const workspaces: Workspace[] = Object.entries(data)
        .map(([id, workspace]: [string, any]) => ({
          id,
          ...workspace,
          createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
          updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
          dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
        }))
        .filter(workspace => workspace.companyId === companyId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      callback(workspaces);
    });

    // Return unsubscribe function
    return () => off(workspacesRef, 'value', unsubscribe);
  }

  // Get workspaces by status
  async getWorkspacesByStatus(companyId: string, status: string): Promise<Workspace[]> {
    try {
      const workspacesRef = ref(database, this.collectionName);

      return new Promise((resolve, reject) => {
        onValue(
          workspacesRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve([]);
              return;
            }

            const workspaces: Workspace[] = Object.entries(data)
              .map(([id, workspace]: [string, any]) => ({
                id,
                ...workspace,
                createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
                updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
                dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
              }))
              .filter(workspace => workspace.companyId === companyId && workspace.status === status)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            resolve(workspaces);
          },
          _error => {
            reject(new Error('Failed to get workspaces by status'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get workspaces by status');
    }
  }

  // Get workspaces by priority
  async getWorkspacesByPriority(companyId: string, priority: string): Promise<Workspace[]> {
    try {
      const workspacesRef = ref(database, this.collectionName);

      return new Promise((resolve, reject) => {
        onValue(
          workspacesRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve([]);
              return;
            }

            const workspaces: Workspace[] = Object.entries(data)
              .map(([id, workspace]: [string, any]) => ({
                id,
                ...workspace,
                createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
                updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
                dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
              }))
              .filter(
                workspace => workspace.companyId === companyId && workspace.priority === priority
              )
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            resolve(workspaces);
          },
          _error => {
            reject(new Error('Failed to get workspaces by priority'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get workspaces by priority');
    }
  }

  // Get workspaces assigned to user
  async getWorkspacesAssignedToUser(companyId: string, userId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = ref(database, this.collectionName);

      return new Promise((resolve, reject) => {
        onValue(
          workspacesRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve([]);
              return;
            }

            const workspaces: Workspace[] = Object.entries(data)
              .map(([id, workspace]: [string, any]) => ({
                id,
                ...workspace,
                createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
                updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
                dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
              }))
              .filter(
                workspace =>
                  workspace.companyId === companyId &&
                  workspace.assignedTo &&
                  workspace.assignedTo.includes(userId)
              )
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            resolve(workspaces);
          },
          _error => {
            reject(new Error('Failed to get workspaces assigned to user'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get workspaces assigned to user');
    }
  }

  // Get overdue workspaces
  async getOverdueWorkspaces(companyId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = ref(database, this.collectionName);
      const now = Date.now();

      return new Promise((resolve, reject) => {
        onValue(
          workspacesRef,
          snapshot => {
            const data = snapshot.val();
            if (!data) {
              resolve([]);
              return;
            }

            const workspaces: Workspace[] = Object.entries(data)
              .map(([id, workspace]: [string, any]) => ({
                id,
                ...workspace,
                createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
                updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
                dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
              }))
              .filter(
                workspace =>
                  workspace.companyId === companyId &&
                  workspace.dueDate &&
                  workspace.dueDate.getTime() < now &&
                  workspace.status !== 'completed'
              )
              .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));

            resolve(workspaces);
          },
          _error => {
            reject(new Error('Failed to get overdue workspaces'));
          }
        );
      });
    } catch {
      throw new Error('Failed to get overdue workspaces');
    }
  }

  // Update workspace progress
  async updateWorkspaceProgress(workspaceId: string, progress: number): Promise<void> {
    try {
      const workspaceRef = ref(database, `${this.collectionName}/${workspaceId}`);
      const updateData: any = {
        progress: Math.max(0, Math.min(100, progress)),
        updatedAt: Date.now(),
      };

      if (progress >= 100) {
        updateData.status = 'completed';
      }

      await update(workspaceRef, updateData);
    } catch {
      throw new Error('Failed to update workspace progress');
    }
  }

  // Bulk update workspaces
  async bulkUpdateWorkspaces(updates: { id: string; data: Partial<Workspace> }[]): Promise<void> {
    try {
      const updatePromises = updates.map(({ id, data }) => {
        const workspaceRef = ref(database, `${this.collectionName}/${id}`);

        const updateData: any = {
          ...data,
          updatedAt: Date.now(),
        };

        // Convert Date objects to timestamps
        if (data.dueDate instanceof Date) {
          updateData.dueDate = data.dueDate.getTime();
        }

        return update(workspaceRef, updateData);
      });

      await Promise.all(updatePromises);
    } catch {
      throw new Error('Failed to bulk update workspaces');
    }
  }

  // Get analytics data
  async getWorkspaceAnalytics(companyId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    overdue: number;
    completedThisMonth: number;
  }> {
    try {
      const workspaces = await this.getWorkspaces(companyId);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const analytics = {
        total: workspaces.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        overdue: 0,
        completedThisMonth: 0,
      };

      workspaces.forEach(workspace => {
        // Count by status
        analytics.byStatus[workspace.status] = (analytics.byStatus[workspace.status] || 0) + 1;

        // Count by priority
        analytics.byPriority[workspace.priority] =
          (analytics.byPriority[workspace.priority] || 0) + 1;

        // Count by type
        analytics.byType[workspace.type] = (analytics.byType[workspace.type] || 0) + 1;

        // Count overdue
        if (workspace.dueDate && workspace.dueDate < now && workspace.status !== 'completed') {
          analytics.overdue++;
        }

        // Count completed this month
        if (workspace.status === 'completed' && workspace.updatedAt >= thisMonth) {
          analytics.completedThisMonth++;
        }
      });

      return analytics;
    } catch {
      throw new Error('Failed to get workspace analytics');
    }
  }

  // Get default board columns
  private getDefaultBoardColumns(): WorkspaceBoardColumn[] {
    return [
      {
        id: 'todo',
        title: 'Zu erledigen',
        color: '#f3f4f6',
        position: 0,
        tasks: [],
      },
      {
        id: 'in-progress',
        title: 'In Bearbeitung',
        color: '#dbeafe',
        position: 1,
        tasks: [],
      },
      {
        id: 'review',
        title: 'Review',
        color: '#fef3c7',
        position: 2,
        tasks: [],
      },
      {
        id: 'done',
        title: 'Erledigt',
        color: '#d1fae5',
        position: 3,
        tasks: [],
      },
    ];
  }
}

export const WorkspaceService = new WorkspaceServiceClass();
