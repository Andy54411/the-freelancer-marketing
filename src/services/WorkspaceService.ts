import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface Workspace {
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
}

interface WorkspaceBoardColumn {
  id: string;
  title: string;
  color: string;
  position: number;
  tasks: WorkspaceTask[];
}

interface WorkspaceTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  position: number;
  columnId?: string;
}

class WorkspaceServiceClass {
  private collectionName = 'workspaces';

  // Get all workspaces for a company
  async getWorkspaces(companyId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = collection(db, this.collectionName);
      const q = query(
        workspacesRef,
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
    } catch (error) {
      console.error('Error getting workspaces:', error);
      throw new Error('Failed to get workspaces');
    }
  }

  // Create a new workspace
  async createWorkspace(workspace: Omit<Workspace, 'id'>): Promise<Workspace> {
    try {
      const workspacesRef = collection(db, this.collectionName);

      const workspaceData = {
        ...workspace,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dueDate: workspace.dueDate || null,
        boardColumns: workspace.boardColumns || this.getDefaultBoardColumns(),
        tasks: workspace.tasks || [],
      };

      const docRef = await addDoc(workspacesRef, workspaceData);

      return {
        id: docRef.id,
        ...workspace,
        createdAt: new Date(),
        updatedAt: new Date(),
        boardColumns: workspace.boardColumns || this.getDefaultBoardColumns(),
        tasks: workspace.tasks || [],
      };
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw new Error('Failed to create workspace');
    }
  }

  // Update a workspace
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<void> {
    try {
      const workspaceRef = doc(db, this.collectionName, workspaceId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        dueDate: updates.dueDate || null,
      };

      await updateDoc(workspaceRef, updateData);
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw new Error('Failed to update workspace');
    }
  }

  // Delete a workspace
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspaceRef = doc(db, this.collectionName, workspaceId);
      await deleteDoc(workspaceRef);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw new Error('Failed to delete workspace');
    }
  }

  // Get workspace by ID
  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    try {
      const workspaceRef = doc(db, this.collectionName, workspaceId);
      const docSnap = await getDocs(
        query(collection(db, this.collectionName), where('__name__', '==', workspaceId))
      );

      if (docSnap.empty) {
        return null;
      }

      const data = docSnap.docs[0].data();
      return {
        id: docSnap.docs[0].id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate(),
      } as Workspace;
    } catch (error) {
      console.error('Error getting workspace by ID:', error);
      throw new Error('Failed to get workspace');
    }
  }

  // Subscribe to workspace changes
  subscribeToWorkspaces(
    companyId: string,
    callback: (workspaces: Workspace[]) => void
  ): () => void {
    const workspacesRef = collection(db, this.collectionName);
    const q = query(
      workspacesRef,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const workspaces = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
      callback(workspaces);
    });
  }

  // Get workspaces by status
  async getWorkspacesByStatus(companyId: string, status: string): Promise<Workspace[]> {
    try {
      const workspacesRef = collection(db, this.collectionName);
      const q = query(
        workspacesRef,
        where('companyId', '==', companyId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
    } catch (error) {
      console.error('Error getting workspaces by status:', error);
      throw new Error('Failed to get workspaces by status');
    }
  }

  // Get workspaces by priority
  async getWorkspacesByPriority(companyId: string, priority: string): Promise<Workspace[]> {
    try {
      const workspacesRef = collection(db, this.collectionName);
      const q = query(
        workspacesRef,
        where('companyId', '==', companyId),
        where('priority', '==', priority),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
    } catch (error) {
      console.error('Error getting workspaces by priority:', error);
      throw new Error('Failed to get workspaces by priority');
    }
  }

  // Get workspaces assigned to user
  async getWorkspacesAssignedToUser(companyId: string, userId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = collection(db, this.collectionName);
      const q = query(
        workspacesRef,
        where('companyId', '==', companyId),
        where('assignedTo', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
    } catch (error) {
      console.error('Error getting workspaces assigned to user:', error);
      throw new Error('Failed to get workspaces assigned to user');
    }
  }

  // Get overdue workspaces
  async getOverdueWorkspaces(companyId: string): Promise<Workspace[]> {
    try {
      const workspacesRef = collection(db, this.collectionName);
      const now = new Date();

      const q = query(
        workspacesRef,
        where('companyId', '==', companyId),
        where('dueDate', '<', now),
        where('status', '!=', 'completed'),
        orderBy('dueDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
        } as Workspace;
      });
    } catch (error) {
      console.error('Error getting overdue workspaces:', error);
      throw new Error('Failed to get overdue workspaces');
    }
  }

  // Update workspace progress
  async updateWorkspaceProgress(workspaceId: string, progress: number): Promise<void> {
    try {
      const workspaceRef = doc(db, this.collectionName, workspaceId);
      await updateDoc(workspaceRef, {
        progress: Math.max(0, Math.min(100, progress)),
        updatedAt: serverTimestamp(),
        ...(progress >= 100 && { status: 'completed' }),
      });
    } catch (error) {
      console.error('Error updating workspace progress:', error);
      throw new Error('Failed to update workspace progress');
    }
  }

  // Bulk update workspaces
  async bulkUpdateWorkspaces(updates: { id: string; data: Partial<Workspace> }[]): Promise<void> {
    try {
      const promises = updates.map(({ id, data }) => {
        const workspaceRef = doc(db, this.collectionName, id);
        return updateDoc(workspaceRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error bulk updating workspaces:', error);
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
    } catch (error) {
      console.error('Error getting workspace analytics:', error);
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
