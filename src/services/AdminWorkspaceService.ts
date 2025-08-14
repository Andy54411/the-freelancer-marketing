// Lambda API Endpoint für Admin Workspace Management
const LAMBDA_API_BASE =
  'https://b14ia0e93d.execute-api.eu-central-1.amazonaws.com/prod/admin/workspaces';

// Development Mode - verwende lokale Mock-Daten bis AWS Lambda deployed ist
const USE_MOCK_DATA = false; // AWS Lambda ist jetzt verfügbar

// Mock Storage für Development
const mockWorkspaces: AdminWorkspace[] = [];
const mockTasks: AdminWorkspaceTask[] = [];
const mockMembers: AdminWorkspaceMember[] = [];

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

  // HTTP Helper für Lambda API Calls
  private async callLambdaAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Hier würde man Auth-Headers hinzufügen
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Lambda API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAllWorkspaces(adminId?: string): Promise<AdminWorkspace[]> {
    try {
      const queryParams = adminId ? `?adminId=${adminId}` : '';
      const result = await this.callLambdaAPI(queryParams);

      return result.workspaces.map((workspace: any) => ({
        id: workspace.workspaceId,
        title: workspace.name,
        description: workspace.description || '',
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
      console.error('Error fetching workspaces:', error);
      throw error;
    }
  }

  async getWorkspacesByAdminId(adminId: string): Promise<AdminWorkspace[]> {
    return this.getAllWorkspaces(adminId);
  }

  async createWorkspace(workspaceData: Partial<AdminWorkspace>): Promise<AdminWorkspace> {
    try {
      const payload = {
        name: workspaceData.title,
        description: workspaceData.description,
        owner: workspaceData.adminId,
        members: workspaceData.assignedTo || [],
        settings: {
          isPublic: false,
          allowGuests: false,
          notifications: true,
        },
        type: workspaceData.type,
        priority: workspaceData.priority,
        systemLevel: workspaceData.systemLevel,
        relatedCompanies: workspaceData.relatedCompanies,
        permissions: workspaceData.permissions,
      };

      const result = await this.callLambdaAPI('', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const workspace = result.workspace;
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
        progress: 0,
        boardColumns: [],
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
    } catch (error) {
      console.error('Error creating workspace:', error);
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
        columnId: task.columnId,
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
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignees: taskData.assignees || [],
        dueDate: taskData.dueDate?.toISOString(),
        labels: taskData.labels || [],
        checklist: taskData.checklist || [],
        estimatedHours: taskData.estimatedHours,
        createdBy: taskData.createdBy,
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
        columnId: task.columnId,
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
    updates: Partial<AdminWorkspaceTask>
  ): Promise<void> {
    return this.updateTask(workspaceId, taskId, updates);
  }
}

export const adminWorkspaceService = new AdminWorkspaceService();
