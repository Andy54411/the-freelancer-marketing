// Lambda API Endpoint für Admin Workspace Management
const LAMBDA_API_BASE =
  'https://b14ia0e93d.execute-api.eu-central-1.amazonaws.com/prod/admin/workspaces';

// AWS Realtime Service Integration
import { awsRealtimeService } from './AWSRealtimeService';

// Admin Workspace Interfaces
export interface AdminWorkspace {
  id: string;
  title: string;
  description?: string;
  type: 'project' | 'department' | 'system' | 'maintenance' | 'analytics';
  status: 'active' | 'inactive' | 'archived' | 'planned';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  adminId: string;
  createdBy?: string;
  progress: number;
  boardColumns?: AdminWorkspaceBoardColumn[];
  tasks?: AdminWorkspaceTask[];
  archivedTasks?: AdminWorkspaceTask[];
  members?: AdminWorkspaceMember[];
  relatedCompanies?: string[];
  systemLevel?: 'platform' | 'company' | 'user' | 'system';
  permissions?: {
    viewLevel: 'admin' | 'manager' | 'viewer';
    editLevel: 'admin' | 'manager';
    deleteLevel: 'admin';
  };
}

export interface AdminWorkspaceBoardColumn {
  id: string;
  title: string;
  color: string;
  position: number;
  tasks: AdminWorkspaceTask[];
}

export interface AdminWorkspaceTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  assignees: string[];
  assignedTo: string[]; // Alias für Kompatibilität
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
  checklist: { id: string; text: string; completed: boolean }[];
  estimatedHours?: number;
  actualHours?: number;
  workspaceId: string;
  createdBy?: string;
  completedAt?: Date;
  comments?: { id: string; content: string; author: string; createdAt: Date }[];
  attachments?: { id: string; name: string; url: string; type: string }[];
  // Board-spezifische Eigenschaften
  columnId?: string;
  position?: number;
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
  // Admin-spezifische Task-Eigenschaften
  systemTask?: boolean;
  automatedTask?: boolean;
  relatedTickets?: string[];
  relatedCompanies?: string[];
  tags?: string[];
  content?: string;
  coverImage?: string;
  contentTitle?: string;
  contentTitleLevel?: 1 | 2 | 3 | 4;
}

export interface AdminWorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export class AdminWorkspaceService {
  private apiUrl =
    'https://b14ia0e93d.execute-api.eu-central-1.amazonaws.com/prod/admin/workspaces';

  // AWS Realtime System für Admin-Dashboard Updates
  private subscriptions = new Map<string, (data: any) => void>();
  private watchedWorkspaces = new Set<string>();
  private workspaceCache = new Map<string, AdminWorkspace>();

  // HTTP Helper für Lambda API Calls
  private async callLambdaAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;

    console.log('[AdminWorkspaceService] Lambda API Call:', {
      url,
      method: options.method || 'GET',
      hasBody: !!options.body,
    });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Hier würde man Auth-Headers hinzufügen
        ...options.headers,
      },
      ...options,
    });

    console.log('[AdminWorkspaceService] Lambda API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AdminWorkspaceService] Lambda API Error Details:', errorText);
      throw new Error(`Lambda API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AdminWorkspaceService] Lambda API Success Response:', data);
    return data;
  }

  async getAllWorkspaces(adminId?: string): Promise<AdminWorkspace[]> {
    try {
      console.log('Loading workspaces for admin:', adminId);

      // Production Lambda API Call
      const queryParams = adminId ? `?adminId=${adminId}` : '';
      const result = await this.callLambdaAPI(queryParams);

      return result.workspaces.map((workspace: any) => ({
        id: workspace.workspaceId || workspace.id,
        title: workspace.title || workspace.name,
        description: workspace.description || '',
        type: workspace.type || 'project',
        status: workspace.status,
        priority: workspace.priority || 'medium',
        assignedTo: workspace.members || [],
        dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
        tags: workspace.tags || [],
        adminId: workspace.adminId || workspace.owner,
        createdBy: workspace.createdBy,
        progress: workspace.progress || 0,
        boardColumns: workspace.boardColumns || [],
        tasks: workspace.tasks || [],
        archivedTasks: workspace.archivedTasks || [],
        members: workspace.members || [],
        relatedCompanies: workspace.relatedCompanies || [],
        systemLevel: workspace.systemLevel || 'platform',
        permissions: workspace.permissions || {
          viewLevel: 'admin',
          editLevel: 'admin',
          deleteLevel: 'admin',
        },
      }));
    } catch (error) {
      console.error('Error fetching admin workspaces:', error);
      return [];
    }
  }

  async getWorkspacesByAdminId(adminId: string): Promise<AdminWorkspace[]> {
    return this.getAllWorkspaces(adminId);
  }

  async createWorkspace(workspaceData: Partial<AdminWorkspace>): Promise<AdminWorkspace> {
    try {
      // Validate required fields
      if (!workspaceData.title?.trim()) {
        throw new Error('Workspace title is required');
      }

      if (!workspaceData.adminId && !workspaceData.createdBy) {
        throw new Error('Admin ID or createdBy is required');
      }

      const payload = {
        title: workspaceData.title,
        description: workspaceData.description,
        adminId: workspaceData.adminId || workspaceData.createdBy,
        createdBy: workspaceData.createdBy || workspaceData.adminId,
        assignedTo: workspaceData.assignedTo || [],
        type: workspaceData.type,
        priority: workspaceData.priority,
        status: workspaceData.status || 'active',
        tags: workspaceData.tags || [],
        dueDate: workspaceData.dueDate,
        systemLevel: workspaceData.systemLevel,
        relatedCompanies: workspaceData.relatedCompanies,
        permissions: workspaceData.permissions,
      };

      console.log('[AdminWorkspaceService] Creating workspace with payload:', payload);

      const result = await this.callLambdaAPI('', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const workspace = result.workspace;
      const transformedWorkspace = {
        id: workspace.workspaceId || workspace.id,
        title: workspace.title || workspace.name,
        description: workspace.description,
        type: workspace.type || 'project',
        status: workspace.status,
        priority: workspace.priority || 'medium',
        assignedTo: workspace.members || [],
        dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
        createdAt: workspace.createdAtISO
          ? new Date(workspace.createdAtISO)
          : new Date(workspace.createdAt),
        updatedAt: workspace.updatedAtISO
          ? new Date(workspace.updatedAtISO)
          : new Date(workspace.updatedAt),
        tags: workspace.tags || [],
        adminId: workspace.adminId || workspace.owner,
        createdBy: workspace.createdBy,
        progress: 0,
        boardColumns: workspace.boardColumns || [],
        tasks: [],
        archivedTasks: [],
        members: workspace.members || [],
        relatedCompanies: workspace.relatedCompanies || [],
        systemLevel: workspace.systemLevel || 'platform',
        permissions: workspace.permissions || {
          viewLevel: 'admin',
          editLevel: 'admin',
          deleteLevel: 'admin',
        },
      };

      console.log('[AdminWorkspaceService] Workspace created successfully:', transformedWorkspace);

      // Send AWS EventBridge event for realtime updates
      if (typeof window !== 'undefined') {
        awsRealtimeService
          .broadcastWorkspaceUpdate(
            'workspace.created',
            workspace.workspaceId,
            workspace.owner,
            workspace
          )
          .catch(console.error);
      }

      return transformedWorkspace;
    } catch (error) {
      console.error('[AdminWorkspaceService] Error creating workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, updates: Partial<AdminWorkspace>): Promise<void> {
    try {
      const payload = {
        name: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        settings: updates.permissions
          ? {
              permissions: updates.permissions,
            }
          : undefined,
        relatedCompanies: updates.relatedCompanies,
        systemLevel: updates.systemLevel,
        updatedBy: updates.adminId,
      };

      await this.callLambdaAPI(`/${workspaceId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      await this.callLambdaAPI(`/${workspaceId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<AdminWorkspace | null> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}`);
      const workspace = result.workspace;

      if (!workspace) return null;

      // Tasks separat laden
      const tasks = await this.getWorkspaceTasks(workspaceId);

      return {
        id: workspace.workspaceId,
        title: workspace.name,
        description: workspace.description,
        type: workspace.type || 'project',
        status: workspace.status,
        priority: workspace.priority || 'medium',
        assignedTo: workspace.members || [],
        dueDate: workspace.dueDate ? new Date(workspace.dueDate) : undefined,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
        tags: workspace.tags || [],
        adminId: workspace.owner,
        createdBy: workspace.createdBy,
        progress: workspace.progress || 0,
        boardColumns: workspace.boardColumns || [],
        tasks: tasks, // Tasks separat geladen
        archivedTasks: tasks.filter(task => task.archived), // Archivierte Tasks filtern
        members: workspace.members || [],
        relatedCompanies: workspace.relatedCompanies || [],
        systemLevel: workspace.systemLevel || 'platform',
        permissions: workspace.permissions || {
          viewLevel: 'admin',
          editLevel: 'admin',
          deleteLevel: 'admin',
        },
      };
    } catch (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }
  }

  // Task Management über Lambda
  async getWorkspaceTasks(workspaceId: string): Promise<AdminWorkspaceTask[]> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/tasks`);
      return result.tasks.map((task: any) => ({
        id: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignees?.[0] || '',
        assignees: task.assignees || [],
        assignedTo: task.assignees || [], // Alias für Kompatibilität
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        labels: task.labels || [],
        checklist: task.checklist || [],
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours || 0,
        workspaceId: task.workspaceId,
        createdBy: task.createdBy,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        comments: task.comments || [],
        attachments: task.attachments || [],
        // Board-spezifische Eigenschaften
        columnId: task.columnId || task.status || 'backlog',
        position: task.position || 0,
        archived: task.archived || false,
        archivedAt: task.archivedAt ? new Date(task.archivedAt) : undefined,
        archivedBy: task.archivedBy,
        // Admin-spezifische Eigenschaften
        systemTask: task.systemTask || false,
        automatedTask: task.automatedTask || false,
        relatedTickets: task.relatedTickets || [],
        relatedCompanies: task.relatedCompanies || [],
        tags: task.tags || [],
        content: task.content,
        coverImage: task.coverImage,
        contentTitle: task.contentTitle,
        contentTitleLevel: task.contentTitleLevel,
      }));
    } catch (error) {
      console.error('Error fetching workspace tasks:', error);
      return [];
    }
  }

  async createTask(
    workspaceId: string,
    taskData: Partial<AdminWorkspaceTask>
  ): Promise<AdminWorkspaceTask> {
    try {
      const payload = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || taskData.columnId || 'backlog',
        priority: taskData.priority || 'medium',
        assignees: taskData.assignees || [],
        dueDate: taskData.dueDate?.toISOString(),
        labels: taskData.labels || [],
        checklist: taskData.checklist || [],
        estimatedHours: taskData.estimatedHours,
        createdBy: taskData.createdBy,
        // Board-spezifische Eigenschaften
        columnId: taskData.columnId || taskData.status || 'backlog',
        position: taskData.position || 0,
        // Admin-spezifische Eigenschaften
        systemTask: taskData.systemTask || false,
        automatedTask: taskData.automatedTask || false,
        relatedCompanies: taskData.relatedCompanies || [],
        tags: taskData.tags || [],
      };

      const result = await this.callLambdaAPI(`/${workspaceId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const task = result.task;
      return {
        id: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignees?.[0] || '',
        assignees: task.assignees || [],
        assignedTo: task.assignees || [], // Alias für Kompatibilität
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        labels: task.labels || [],
        checklist: task.checklist || [],
        estimatedHours: task.estimatedHours,
        actualHours: 0,
        workspaceId: task.workspaceId,
        createdBy: task.createdBy,
        comments: [],
        attachments: [],
        // Board-spezifische Eigenschaften
        columnId: task.columnId || task.status || 'backlog',
        position: task.position || 0,
        archived: false,
        // Admin-spezifische Eigenschaften
        systemTask: task.systemTask || false,
        automatedTask: task.automatedTask || false,
        relatedTickets: task.relatedTickets || [],
        relatedCompanies: task.relatedCompanies || [],
        tags: task.tags || [],
        content: task.content,
        coverImage: task.coverImage,
        contentTitle: task.contentTitle,
        contentTitleLevel: task.contentTitleLevel,
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    updates: Partial<AdminWorkspaceTask>
  ): Promise<void> {
    try {
      const payload = {
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        assignees: updates.assignees,
        dueDate: updates.dueDate?.toISOString(),
        labels: updates.labels,
        checklist: updates.checklist,
        estimatedHours: updates.estimatedHours,
        actualHours: updates.actualHours,
        updatedBy: updates.createdBy,
      };

      await this.callLambdaAPI(`/${workspaceId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    try {
      await this.callLambdaAPI(`/${workspaceId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Members Management
  async getWorkspaceMembers(workspaceId: string): Promise<AdminWorkspaceMember[]> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/members`);
      return result.members.map((member: any) => ({
        id: member.memberId,
        name: member.email, // Falls kein Name vorhanden
        email: member.email,
        role: member.role,
        avatar: member.avatar,
      }));
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  }

  async addWorkspaceMember(
    workspaceId: string,
    memberData: { email: string; role: string; addedBy: string }
  ): Promise<void> {
    try {
      await this.callLambdaAPI(`/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: memberData.email,
          role: memberData.role,
          addedBy: memberData.addedBy,
        }),
      });
    } catch (error) {
      console.error('Error adding workspace member:', error);
      throw error;
    }
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
    try {
      await this.callLambdaAPI(`/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error removing workspace member:', error);
      throw error;
    }
  }

  // Activity Log
  async getWorkspaceActivity(workspaceId: string): Promise<any[]> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/activity`);
      return result.activities || [];
    } catch (error) {
      console.error('Error fetching workspace activity:', error);
      return [];
    }
  }

  // Boards Management
  async getWorkspaceBoards(workspaceId: string): Promise<any[]> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/boards`);
      return result.boards || [];
    } catch (error) {
      console.error('Error fetching workspace boards:', error);
      return [];
    }
  }

  async createBoard(
    workspaceId: string,
    boardData: { name: string; description?: string; type?: string; createdBy: string }
  ): Promise<any> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/boards`, {
        method: 'POST',
        body: JSON.stringify(boardData),
      });
      return result.board;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  }

  // Aliases für Kompatibilität mit bestehenden Code
  async getAdminWorkspaces(): Promise<AdminWorkspace[]> {
    return this.getAllWorkspaces();
  }

  async getWorkspacesByAdmin(adminId: string): Promise<AdminWorkspace[]> {
    return this.getWorkspacesByAdminId(adminId);
  }

  async createAdminWorkspace(
    workspace: Omit<AdminWorkspace, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AdminWorkspace> {
    return this.createWorkspace(workspace);
  }

  async updateAdminWorkspace(workspaceId: string, updates: Partial<AdminWorkspace>): Promise<void> {
    return this.updateWorkspace(workspaceId, updates);
  }

  async deleteAdminWorkspace(workspaceId: string): Promise<void> {
    return this.deleteWorkspace(workspaceId);
  }

  async getAdminWorkspace(workspaceId: string): Promise<AdminWorkspace | null> {
    return this.getWorkspace(workspaceId);
  }

  // Task Update in Workspace
  async updateTaskInWorkspace(
    workspaceId: string,
    taskId: string,
    taskData: Partial<AdminWorkspaceTask>
  ): Promise<AdminWorkspaceTask> {
    try {
      const result = await this.callLambdaAPI(`/${workspaceId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      });

      return result.task;
    } catch (error) {
      console.error('Error updating task in workspace:', error);
      throw error;
    }
  }

  // AWS EventBridge/WebSocket Realtime System für Admin Workspaces
  // Note: Realtime updates werden jetzt über EventBridge + WebSocket abgewickelt
  // Kein Polling mehr erforderlich

  private async checkForUpdates(): Promise<void> {
    // AWS EventBridge handles realtime updates automatically
    // No manual polling needed - updates come via WebSocket from AWS
    return;
  }

  // Subscribe to workspace changes (AWS EventBridge Integration + Fallback Polling)
  subscribeToWorkspaces(
    adminId: string,
    callback: (workspaces: AdminWorkspace[]) => void
  ): () => void {
    const subscriptionId = `workspaces_${adminId}_${Date.now()}`;

    // Production: AWS WebSocket für Realtime Updates + Fallback Polling
    let unsubscribeWebSocket: (() => void) | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let webSocketConnected = false;

    // Versuche WebSocket-Verbindung
    awsRealtimeService
      .subscribeToWorkspaceEvents(adminId, async event => {
        console.log('🔄 Realtime workspace update received:', event);
        webSocketConnected = true;

        // WebSocket funktioniert - deaktiviere Polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          console.log('✅ WebSocket connected - Polling deaktiviert');
        }

        try {
          const workspaces = await this.getAllWorkspaces(adminId);
          callback(workspaces);
        } catch (error) {
          console.error('Error reloading workspaces after realtime update:', error);
        }
      })
      .then(unsubscribe => {
        unsubscribeWebSocket = unsubscribe;
        webSocketConnected = true;
        console.log('✅ WebSocket Realtime System verbunden');
      })
      .catch(error => {
        console.warn('⚠️ WebSocket Connection fehlgeschlagen:', error);
        webSocketConnected = false;
      });

    // Store callback for manual updates
    this.subscriptions.set(subscriptionId, async (data: any) => {
      try {
        const workspaces = await this.getAllWorkspaces(adminId);
        callback(workspaces);
      } catch (error) {
        console.error('Error loading workspaces:', error);
      }
    });

    // Load initial data immediately
    this.getAllWorkspaces(adminId).then(callback).catch(console.error);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
      if (unsubscribeWebSocket) {
        unsubscribeWebSocket();
      }
    };
  }

  // Subscribe to workspace tasks (Smart Polling)
  subscribeToWorkspaceTasks(
    workspaceId: string,
    callback: (tasks: AdminWorkspaceTask[]) => void
  ): () => void {
    const subscriptionId = `workspace_tasks_${workspaceId}_${Date.now()}`;

    // Add workspace to watched list
    this.watchedWorkspaces.add(workspaceId);

    this.subscriptions.set(subscriptionId, (workspace: AdminWorkspace) => {
      if (workspace.id === workspaceId && workspace.tasks) {
        callback(workspace.tasks);
      }
    });

    return () => {
      this.subscriptions.delete(subscriptionId);
      this.watchedWorkspaces.delete(workspaceId);
    };
  }

  // Subscribe to specific workspace changes
  subscribeToWorkspace(
    workspaceId: string,
    callback: (workspace: AdminWorkspace) => void
  ): () => void {
    const subscriptionId = `workspace_${workspaceId}_${Date.now()}`;

    this.watchedWorkspaces.add(workspaceId);

    this.subscriptions.set(subscriptionId, (workspace: AdminWorkspace) => {
      if (workspace.id === workspaceId) {
        callback(workspace);
      }
    });

    return () => {
      this.subscriptions.delete(subscriptionId);
      this.watchedWorkspaces.delete(workspaceId);
    };
  }

  // Enhanced CRUD operations with real-time notifications
  async createWorkspaceWithRealtime(
    workspaceData: Partial<AdminWorkspace>
  ): Promise<AdminWorkspace> {
    const workspace = await this.createWorkspace(workspaceData);

    // Trigger immediate update check
    setTimeout(() => this.checkForUpdates(), 100);

    return workspace;
  }

  async updateWorkspaceWithRealtime(
    workspaceId: string,
    updates: Partial<AdminWorkspace>
  ): Promise<AdminWorkspace> {
    await this.updateWorkspace(workspaceId, updates);

    // Get updated workspace
    const workspace = await this.getWorkspace(workspaceId);

    // Send AWS EventBridge event for realtime updates (both client and server)
    awsRealtimeService
      .broadcastWorkspaceUpdate('workspace.updated', workspaceId, workspace.adminId, workspace)
      .catch(console.error);

    // Update cache and notify immediately
    this.workspaceCache.set(workspaceId, workspace);
    this.subscriptions.forEach((callback, subscriptionId) => {
      if (subscriptionId.includes(workspaceId)) {
        callback(workspace);
      }
    });

    return workspace;
  }

  async deleteWorkspaceWithRealtime(workspaceId: string): Promise<void> {
    await this.deleteWorkspace(workspaceId);

    // Remove from cache and notify
    this.workspaceCache.delete(workspaceId);
    this.watchedWorkspaces.delete(workspaceId);

    // Trigger immediate update check for remaining workspaces
    setTimeout(() => this.checkForUpdates(), 100);
  }

  // Cleanup realtime connections
  disconnect(): void {
    this.subscriptions.clear();
    this.watchedWorkspaces.clear();
    this.workspaceCache.clear();
  }
}

export const adminWorkspaceService = new AdminWorkspaceService();
