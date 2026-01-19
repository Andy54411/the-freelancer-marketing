/**
 * TasksService - MongoDB-basierte Aufgabenverwaltung
 * ====================================================
 * 
 * Speichert Aufgaben in MongoDB für Webmail und Chat.
 * Unterstützt Task-Listen, Spaces und Wiederholungen.
 */

import { v4 as uuidv4 } from 'uuid';
import mongoDBService, { 
  Task, 
  TaskList, 
  RepeatConfig,
  ObjectId 
} from './MongoDBService';

// Response Types für API-Kompatibilität
export interface TaskResponse {
  id: string;
  userId: string;
  listId: string;
  spaceId: string | null;
  title: string;
  notes: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: number | null;
  starred: boolean;
  priority: 'low' | 'medium' | 'high' | null;
  repeat: RepeatConfig | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskListResponse {
  id: string;
  userId: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  taskCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  listId?: string;
  spaceId?: string | null;
  dueDate?: string | null;
  starred?: boolean;
  priority?: 'low' | 'medium' | 'high' | null;
  repeat?: RepeatConfig | null;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  listId?: string;
  spaceId?: string | null;
  dueDate?: string | null;
  completed?: boolean;
  starred?: boolean;
  priority?: 'low' | 'medium' | 'high' | null;
  repeat?: RepeatConfig | null;
  order?: number;
}

class TasksService {
  constructor() {
    console.log('[TasksService] MongoDB-basiert initialisiert');
  }

  // ==================== TASK LISTS ====================

  /**
   * Standard-Liste erstellen falls keine existiert
   */
  async ensureDefaultList(userId: string): Promise<TaskListResponse> {
    const normalizedId = userId.toLowerCase().trim();
    
    await mongoDBService.connect();
    
    // Prüfen ob Default-Liste existiert
    let defaultList = await mongoDBService.taskLists.findOne({
      userId: normalizedId,
      isDefault: true,
    });

    if (!defaultList) {
      const now = new Date();
      const newList: TaskList = {
        userId: normalizedId,
        name: 'Meine Aufgaben',
        color: '#4285f4',
        order: 0,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await mongoDBService.taskLists.insertOne(newList);
      defaultList = { ...newList, _id: result.insertedId };
    }

    return this.mapTaskListToResponse(defaultList);
  }

  /**
   * Alle Listen eines Benutzers abrufen
   */
  async getTaskLists(userId: string): Promise<TaskListResponse[]> {
    const normalizedId = userId.toLowerCase().trim();
    
    await mongoDBService.connect();
    await this.ensureDefaultList(userId);

    const lists = await mongoDBService.taskLists
      .find({ userId: normalizedId })
      .sort({ order: 1 })
      .toArray();

    // Task-Counts hinzufügen
    const listsWithCounts = await Promise.all(
      lists.map(async (list: TaskList) => {
        const taskCount = await mongoDBService.tasks.countDocuments({
          userId: normalizedId,
          listId: list._id!.toString(),
          completed: false,
        });
        return { ...this.mapTaskListToResponse(list), taskCount };
      })
    );

    return listsWithCounts;
  }

  /**
   * Neue Liste erstellen
   */
  async createTaskList(
    userId: string,
    name: string,
    color?: string
  ): Promise<TaskListResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    // Höchste Order ermitteln
    const lastList = await mongoDBService.taskLists
      .find({ userId: normalizedId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    
    const newOrder = lastList.length > 0 ? lastList[0].order + 1 : 0;

    const newList: TaskList = {
      userId: normalizedId,
      name,
      color: color || '#4285f4',
      order: newOrder,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoDBService.taskLists.insertOne(newList);

    return this.mapTaskListToResponse({ ...newList, _id: result.insertedId });
  }

  /**
   * Liste aktualisieren
   */
  async updateTaskList(
    userId: string,
    listId: string,
    updates: { name?: string; color?: string; order?: number }
  ): Promise<TaskListResponse | null> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.taskLists.updateOne(
      { _id: new ObjectId(listId), userId: normalizedId },
      { $set: { ...updates, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    const list = await mongoDBService.taskLists.findOne({
      _id: new ObjectId(listId),
    });

    return list ? this.mapTaskListToResponse(list) : null;
  }

  /**
   * Liste löschen (mit allen Tasks)
   */
  async deleteTaskList(userId: string, listId: string): Promise<boolean> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    // Prüfen ob Default-Liste
    const list = await mongoDBService.taskLists.findOne({
      _id: new ObjectId(listId),
      userId: normalizedId,
    });

    if (!list) {
      return false;
    }

    if (list.isDefault) {
      throw new Error('Die Standardliste kann nicht gelöscht werden');
    }

    // Alle Tasks der Liste löschen
    await mongoDBService.tasks.deleteMany({
      userId: normalizedId,
      listId,
    });

    // Liste löschen
    const result = await mongoDBService.taskLists.deleteOne({
      _id: new ObjectId(listId),
    });

    return result.deletedCount > 0;
  }

  // ==================== TASKS ====================

  /**
   * Alle Tasks eines Benutzers abrufen
   */
  async getTasks(
    userId: string,
    options?: {
      listId?: string;
      spaceId?: string;
      completed?: boolean;
      starred?: boolean;
      limit?: number;
    }
  ): Promise<TaskResponse[]> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const query: Record<string, unknown> = { userId: normalizedId };

    if (options?.listId) {
      query.listId = options.listId;
    }
    if (options?.spaceId !== undefined) {
      query.spaceId = options.spaceId;
    }
    if (options?.completed !== undefined) {
      query.completed = options.completed;
    }
    if (options?.starred !== undefined) {
      query.starred = options.starred;
    }

    const tasks = await mongoDBService.tasks
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .limit(options?.limit || 1000)
      .toArray();

    return tasks.map((t: Task) => this.mapTaskToResponse(t));
  }

  /**
   * Tasks für einen Space abrufen
   */
  async getSpaceTasks(userId: string, spaceId: string): Promise<TaskResponse[]> {
    return this.getTasks(userId, { spaceId });
  }

  /**
   * Einzelne Task abrufen
   */
  async getTask(userId: string, taskId: string): Promise<TaskResponse | null> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const task = await mongoDBService.tasks.findOne({
      _id: new ObjectId(taskId),
      userId: normalizedId,
    });

    return task ? this.mapTaskToResponse(task) : null;
  }

  /**
   * Neue Task erstellen
   */
  async createTask(userId: string, input: CreateTaskInput): Promise<TaskResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    // Default-Liste holen falls keine angegeben
    let listId = input.listId;
    if (!listId) {
      const defaultList = await this.ensureDefaultList(userId);
      listId = defaultList.id;
    }

    // Höchste Order in der Liste ermitteln
    const lastTask = await mongoDBService.tasks
      .find({ userId: normalizedId, listId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    
    const newOrder = lastTask.length > 0 ? lastTask[0].order + 1 : 0;

    const newTask: Task = {
      userId: normalizedId,
      listId,
      spaceId: input.spaceId || null,
      title: input.title,
      notes: input.notes || '',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      completed: false,
      completedAt: null,
      starred: input.starred || false,
      priority: input.priority || null,
      repeat: input.repeat || null,
      order: newOrder,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoDBService.tasks.insertOne(newTask);

    console.log(`[TasksService] Task erstellt: ${input.title} für ${normalizedId}`);

    return this.mapTaskToResponse({ ...newTask, _id: result.insertedId });
  }

  /**
   * Task aktualisieren
   */
  async updateTask(
    userId: string,
    taskId: string,
    updates: UpdateTaskInput
  ): Promise<TaskResponse | null> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.listId !== undefined) updateData.listId = updates.listId;
    if (updates.spaceId !== undefined) updateData.spaceId = updates.spaceId;
    if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }
    if (updates.starred !== undefined) updateData.starred = updates.starred;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.repeat !== undefined) updateData.repeat = updates.repeat;
    if (updates.order !== undefined) updateData.order = updates.order;

    // Completion-Status separat behandeln
    if (updates.completed !== undefined) {
      updateData.completed = updates.completed;
      updateData.completedAt = updates.completed ? now : null;
    }

    const result = await mongoDBService.tasks.updateOne(
      { _id: new ObjectId(taskId), userId: normalizedId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    return this.getTask(userId, taskId);
  }

  /**
   * Task als erledigt markieren
   */
  async completeTask(
    userId: string,
    taskId: string,
    completed: boolean
  ): Promise<TaskResponse | null> {
    return this.updateTask(userId, taskId, { completed });
  }

  /**
   * Task löschen
   */
  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const result = await mongoDBService.tasks.deleteOne({
      _id: new ObjectId(taskId),
      userId: normalizedId,
    });

    return result.deletedCount > 0;
  }

  /**
   * Alle erledigten Tasks einer Liste löschen
   */
  async clearCompletedTasks(userId: string, listId?: string): Promise<number> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const query: Record<string, unknown> = {
      userId: normalizedId,
      completed: true,
    };

    if (listId) {
      query.listId = listId;
    }

    const result = await mongoDBService.tasks.deleteMany(query);

    return result.deletedCount;
  }

  /**
   * Tasks neu ordnen
   */
  async reorderTasks(
    userId: string,
    taskIds: string[]
  ): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const operations = taskIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id), userId: normalizedId },
        update: { $set: { order: index, updatedAt: new Date() } },
      },
    }));

    await mongoDBService.tasks.bulkWrite(operations);
  }

  // ==================== STATISTICS ====================

  /**
   * Task-Statistiken abrufen
   */
  async getTaskStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    starred: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    await mongoDBService.connect();

    const [total, completed, starred, overdue, dueToday, dueThisWeek] = await Promise.all([
      mongoDBService.tasks.countDocuments({ userId: normalizedId }),
      mongoDBService.tasks.countDocuments({ userId: normalizedId, completed: true }),
      mongoDBService.tasks.countDocuments({ userId: normalizedId, starred: true, completed: false }),
      mongoDBService.tasks.countDocuments({
        userId: normalizedId,
        completed: false,
        dueDate: { $lt: today },
      }),
      mongoDBService.tasks.countDocuments({
        userId: normalizedId,
        completed: false,
        dueDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      }),
      mongoDBService.tasks.countDocuments({
        userId: normalizedId,
        completed: false,
        dueDate: {
          $gte: today,
          $lt: endOfWeek,
        },
      }),
    ]);

    return {
      total,
      completed,
      pending: total - completed,
      starred,
      overdue,
      dueToday,
      dueThisWeek,
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  private mapTaskToResponse(task: Task): TaskResponse {
    return {
      id: task._id!.toString(),
      userId: task.userId,
      listId: task.listId,
      spaceId: task.spaceId || null,
      title: task.title,
      notes: task.notes,
      dueDate: task.dueDate?.toISOString() || null,
      completed: task.completed,
      completedAt: task.completedAt?.getTime() || null,
      starred: task.starred,
      priority: task.priority,
      repeat: task.repeat,
      order: task.order,
      createdAt: task.createdAt.getTime(),
      updatedAt: task.updatedAt.getTime(),
    };
  }

  private mapTaskListToResponse(list: TaskList): TaskListResponse {
    return {
      id: list._id!.toString(),
      userId: list.userId,
      name: list.name,
      color: list.color,
      order: list.order,
      isDefault: list.isDefault,
      createdAt: list.createdAt.getTime(),
      updatedAt: list.updatedAt.getTime(),
    };
  }
}

// Singleton Export
const tasksService = new TasksService();
export default tasksService;
