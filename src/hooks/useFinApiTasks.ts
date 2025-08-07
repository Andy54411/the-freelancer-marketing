import { useState, useEffect, useCallback, useRef } from 'react';

export interface FinApiTask {
  id: string;
  status:
    | 'NOT_YET_STARTED'
    | 'IN_PROGRESS'
    | 'WEB_FORM_REQUIRED'
    | 'COMPLETED'
    | 'COMPLETED_WITH_ERROR';
  type: string;
  createdAt: string;
  completedAt?: string;
  description?: string;
  progress?: number;
  errorMessage?: string;
  webFormUrl?: string;
  taskilo?: {
    retrievedAt: string;
    environment: 'sandbox' | 'admin';
    server: string;
    statusInfo: {
      message: string;
      color: string;
      icon: string;
    };
    progressPercent: number;
    estimatedCompletion: string | null;
  };
}

export interface TasksListResponse {
  success: boolean;
  tasks: FinApiTask[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  meta: {
    environment: string;
    server: string;
    timestamp: string;
  };
}

export interface TaskDetailsResponse {
  success: boolean;
  task: FinApiTask;
  meta: {
    taskId: string;
    environment: string;
    server: string;
    timestamp: string;
  };
}

export interface CreateTaskRequest {
  type: 'UPDATE_BANK_CONNECTIONS' | 'IMPORT_TRANSACTIONS' | 'CATEGORIZE_TRANSACTIONS';
  bankConnectionIds?: string[];
  accountIds?: string[];
  maxDaysBack?: number;
  minImportDate?: string;
  maxImportDate?: string;
}

/**
 * Hook für Task-Liste mit automatischem Polling
 */
export function useFinApiTasks(
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    credentialType?: 'sandbox' | 'admin';
    page?: number;
    perPage?: number;
  } = {}
) {
  const {
    autoRefresh = true,
    refreshInterval = 10000, // 10 Sekunden
    credentialType = 'sandbox',
    page = 1,
    perPage = 20,
  } = options;

  const [tasks, setTasks] = useState<FinApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    perPage: 20,
    totalPages: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams({
        credentialType,
        page: page.toString(),
        perPage: perPage.toString(),
      });

      const response = await fetch(`/api/finapi/tasks?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }

      const data: TasksListResponse = await response.json();

      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('❌ Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [credentialType, page, perPage]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTasks, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchTasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    tasks,
    loading,
    error,
    pagination,
    refetch: fetchTasks,
    // Gefilterte Tasks für bessere UX
    activeTasks: tasks.filter(
      task => task.status === 'IN_PROGRESS' || task.status === 'WEB_FORM_REQUIRED'
    ),
    completedTasks: tasks.filter(
      task => task.status === 'COMPLETED' || task.status === 'COMPLETED_WITH_ERROR'
    ),
    pendingTasks: tasks.filter(task => task.status === 'NOT_YET_STARTED'),
  };
}

/**
 * Hook für einzelne Task-Details mit Real-time Updates
 */
export function useFinApiTask(
  taskId: string,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    credentialType?: 'sandbox' | 'admin';
  } = {}
) {
  const {
    autoRefresh = true,
    refreshInterval = 5000, // 5 Sekunden für einzelne Tasks
    credentialType = 'sandbox',
  } = options;

  const [task, setTask] = useState<FinApiTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams({ credentialType });
      const response = await fetch(`/api/finapi/tasks/${taskId}?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch task');
      }

      const data: TaskDetailsResponse = await response.json();
      setTask(data.task);
    } catch (err: any) {
      console.error('❌ Error fetching task:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId, credentialType]);

  const cancelTask = useCallback(async () => {
    try {
      const params = new URLSearchParams({ credentialType });
      const response = await fetch(`/api/finapi/tasks/${taskId}?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel task');
      }

      // Refresh task data after cancellation
      await fetchTask();

      return true;
    } catch (err: any) {
      console.error('❌ Error cancelling task:', err);
      setError(err.message);
      return false;
    }
  }, [taskId, credentialType, fetchTask]);

  // Initial fetch
  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [fetchTask, taskId]);

  // Auto-refresh setup - stop refreshing for completed tasks
  useEffect(() => {
    if (
      autoRefresh &&
      refreshInterval > 0 &&
      task &&
      task.status !== 'COMPLETED' &&
      task.status !== 'COMPLETED_WITH_ERROR'
    ) {
      intervalRef.current = setInterval(fetchTask, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchTask, task]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    task,
    loading,
    error,
    refetch: fetchTask,
    cancelTask,
    // Computed properties für UI
    isActive: task?.status === 'IN_PROGRESS' || task?.status === 'WEB_FORM_REQUIRED',
    isCompleted: task?.status === 'COMPLETED' || task?.status === 'COMPLETED_WITH_ERROR',
    hasError: task?.status === 'COMPLETED_WITH_ERROR',
    needsUserAction: task?.status === 'WEB_FORM_REQUIRED',
    progressPercent: task?.taskilo?.progressPercent || 0,
  };
}

/**
 * Hook für Task-Erstellung
 */
export function useCreateFinApiTask(credentialType: 'sandbox' | 'admin' = 'sandbox') {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(
    async (taskRequest: CreateTaskRequest): Promise<FinApiTask | null> => {
      try {
        setCreating(true);
        setError(null);

        const params = new URLSearchParams({ credentialType });
        const response = await fetch(`/api/finapi/tasks?${params}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskRequest),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create task');
        }

        const data = await response.json();
        return data.task;
      } catch (err: any) {
        console.error('❌ Error creating task:', err);
        setError(err.message);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [credentialType]
  );

  return {
    createTask,
    creating,
    error,
    // Helper functions für häufige Task-Typen
    createUpdateTask: (bankConnectionIds: string[]) =>
      createTask({
        type: 'UPDATE_BANK_CONNECTIONS',
        bankConnectionIds,
      }),
    createImportTask: (accountIds: string[], maxDaysBack?: number) =>
      createTask({
        type: 'IMPORT_TRANSACTIONS',
        accountIds,
        maxDaysBack,
      }),
    createCategorizeTask: (minImportDate?: string, maxImportDate?: string) =>
      createTask({
        type: 'CATEGORIZE_TRANSACTIONS',
        minImportDate,
        maxImportDate,
      }),
  };
}

/**
 * Hook für Task-Statistiken und Monitoring
 */
export function useFinApiTasksStats(credentialType: 'sandbox' | 'admin' = 'sandbox') {
  const { tasks, loading, error } = useFinApiTasks({
    credentialType,
    perPage: 100, // Get more tasks for better stats
  });

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'WEB_FORM_REQUIRED')
      .length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    failed: tasks.filter(t => t.status === 'COMPLETED_WITH_ERROR').length,
    pending: tasks.filter(t => t.status === 'NOT_YET_STARTED').length,
    needsAction: tasks.filter(t => t.status === 'WEB_FORM_REQUIRED').length,
  };

  return {
    stats,
    tasks,
    loading,
    error,
    // Status percentages für Dashboard
    activePercent: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
    successRate:
      stats.total > 0
        ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
        : 100,
  };
}
